# syntax=docker/dockerfile:1.7
# Vexira Host frontend — Next standalone output keeps runtime free of build dependencies.
FROM node:22-alpine AS builder
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

ARG NEXT_PUBLIC_APP_URL=https://vexirahost.com
ARG NEXT_PUBLIC_API_URL=https://api.vexirahost.com/api/v1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/api-sdk/package.json ./packages/api-sdk/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN --mount=type=cache,id=vexira-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile --filter @vexira/frontend... --ignore-scripts

COPY apps/frontend ./apps/frontend
COPY packages/api-sdk ./packages/api-sdk
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY packages/utils ./packages/utils

RUN pnpm --filter @vexira/types build \
 && pnpm --filter @vexira/utils build \
 && pnpm --filter @vexira/ui build \
 && pnpm --filter @vexira/api-sdk build \
 && pnpm --filter @vexira/frontend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat tini

COPY --from=builder --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/public ./apps/frontend/public

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
