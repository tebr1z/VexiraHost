# ─── Backend (production) ───────────────────────────────────────
# Node is INSIDE this image — host Node.js is NOT required.
FROM node:22-alpine AS base
RUN apk add --no-cache ca-certificates openssl libc6-compat curl \
 && corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY apps/backend ./apps/backend
COPY packages/config ./packages/config
COPY packages/types ./packages/types

RUN pnpm install --no-frozen-lockfile --filter @vexira/backend... --ignore-scripts

# prisma generate downloads engines — some VPS networks block binaries.prisma.sh
RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/config build \
 && set -e; \
    mirrors="https://binaries.prisma.sh https://registry.npmmirror.com/-/binary/prisma https://cdn.npmmirror.com/binaries/prisma"; \
    ok=0; \
    for mirror in $mirrors; do \
      echo "Trying PRISMA_ENGINES_MIRROR=$mirror"; \
      i=1; \
      while [ "$i" -le 3 ]; do \
        if PRISMA_ENGINES_MIRROR="$mirror" pnpm --filter @vexira/backend prisma:generate; then \
          ok=1; \
          break 2; \
        fi; \
        echo "prisma generate failed (mirror=$mirror attempt $i/3)"; \
        i=$((i + 1)); \
        sleep 5; \
      done; \
    done; \
    if [ "$ok" != 1 ]; then \
      echo "All Prisma engine mirrors failed. From the host try:"; \
      echo "  curl -I --max-time 20 https://binaries.prisma.sh/"; \
      echo "  DOCKER_BUILDKIT=1 docker compose ... build --network=host backend"; \
      exit 1; \
    fi \
 && pnpm --filter @vexira/backend build

# Copy the whole built workspace — keeps pnpm links + prisma CLI intact
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
