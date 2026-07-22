# ─── Backend (production) ───────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
# husky prepare fails in Docker — skip lifecycle scripts
# no-frozen-lockfile: allows install if lockfile briefly lags package.json on server
RUN pnpm install --no-frozen-lockfile --filter @vexira/backend... --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @vexira/types build
RUN pnpm --filter @vexira/config build
RUN pnpm --filter @vexira/backend prisma:generate
RUN pnpm --filter @vexira/backend build
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
# Ensure Prisma client matches schema inside the image
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
