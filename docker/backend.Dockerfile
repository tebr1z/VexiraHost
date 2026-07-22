# ─── Backend (production) ───────────────────────────────────────
# Node is INSIDE this image — host Node.js is NOT required.
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY apps/backend ./apps/backend
COPY packages/config ./packages/config
COPY packages/types ./packages/types

RUN pnpm install --no-frozen-lockfile --filter @vexira/backend... --ignore-scripts

RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/config build \
 && pnpm --filter @vexira/backend prisma:generate \
 && pnpm --filter @vexira/backend build

# Copy the whole built workspace — keeps pnpm links + prisma CLI intact
FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl
COPY --from=builder /app /app
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
