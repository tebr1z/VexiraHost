# ─── Backend (production) ───────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
# Full workspace source first so pnpm links stay valid
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend ./apps/backend
COPY packages/config ./packages/config
COPY packages/types ./packages/types

RUN pnpm install --no-frozen-lockfile --filter @vexira/backend... --ignore-scripts

RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/config build \
 && pnpm --filter @vexira/backend prisma:generate \
 && pnpm --filter @vexira/backend build

# Portable production tree (workspace deps resolved)
RUN pnpm --filter @vexira/backend deploy --prod --legacy /out

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl
COPY --from=builder /out ./
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./package.json
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
