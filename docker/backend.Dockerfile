# syntax=docker/dockerfile:1.7
# Vexira Host backend — build tools stay in builder; runtime gets production deps only.
FROM node:22-alpine AS builder
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
RUN apk add --no-cache ca-certificates openssl libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN --mount=type=cache,id=vexira-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile --filter @vexira/backend... --ignore-scripts

COPY apps/backend ./apps/backend
COPY packages/config ./packages/config
COPY packages/types ./packages/types

RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/config build \
 && set -e; \
    mirrors="https://registry.npmmirror.com/-/binary/prisma https://cdn.npmmirror.com/binaries/prisma https://binaries.prisma.sh"; \
    ok=0; \
    for mirror in $mirrors; do \
      echo "Trying PRISMA_ENGINES_MIRROR=$mirror"; \
      if PRISMA_ENGINES_MIRROR="$mirror" pnpm --filter @vexira/backend prisma:generate; then \
        ok=1; \
        break; \
      fi; \
    done; \
    test "$ok" = 1 \
 && pnpm --filter @vexira/backend build \
 && pnpm --filter @vexira/backend deploy --prod --ignore-scripts /prod/backend \
 && PRISMA_CLIENT_DIR="$(find /app/node_modules -type d -name .prisma -print -quit)" \
 && test -n "$PRISMA_CLIENT_DIR" \
 && find "$PRISMA_CLIENT_DIR" -type f -name '*.tmp*' -delete \
 && cp -R "$PRISMA_CLIENT_DIR" /prod/backend/node_modules/.prisma

FROM node:22-alpine AS runner
WORKDIR /app/apps/backend
ENV NODE_ENV=production
ENV PORT=4000
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
RUN apk add --no-cache ca-certificates openssl libc6-compat su-exec tini

COPY --from=builder --chown=node:node /prod/backend/package.json ./package.json
COPY --from=builder --chown=node:node /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod/backend/dist ./dist
COPY --from=builder --chown=node:node /prod/backend/prisma ./prisma
COPY --from=builder --chown=node:node /prod/backend/prisma.config.ts ./prisma.config.ts
COPY docker/backend-entrypoint.sh /usr/local/bin/vexira-backend-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/vexira-backend-entrypoint \
 && chmod +x /usr/local/bin/vexira-backend-entrypoint \
 && mkdir -p .whatsapp-auth storage \
 && chown -R node:node /app/apps/backend

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/vexira-backend-entrypoint"]
