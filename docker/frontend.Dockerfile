# ─── Frontend (production, Next.js standalone) ──────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_APP_URL=https://vexirahost.com
ARG NEXT_PUBLIC_API_URL=https://api.vexirahost.com/api/v1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Full workspace source first so pnpm links stay valid
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter @vexira/frontend... --ignore-scripts

# Workspace packages export dist/ — build them before Next
RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/utils build \
 && pnpm --filter @vexira/ui build \
 && pnpm --filter @vexira/api-sdk build \
 && pnpm --filter @vexira/frontend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
