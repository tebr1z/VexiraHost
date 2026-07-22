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

# Fresh prod install in final image (avoids broken pnpm symlinks / deploy flags)
FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/package.json

RUN pnpm install --no-frozen-lockfile --filter @vexira/backend... --prod --ignore-scripts \
 && cd apps/backend && npx prisma generate --schema=./prisma/schema.prisma

WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
