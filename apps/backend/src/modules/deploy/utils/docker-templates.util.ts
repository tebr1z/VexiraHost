import type { DeployStack } from "@prisma/client";

export function defaultContainerPort(_stack: DeployStack): number {
  return 3000;
}

export function buildDockerfile(stack: DeployStack): string {
  if (stack === "NESTJS") {
    return `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
`;
  }

  return `FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
`;
}

export function buildDockerComposeProjectName(accountId: string, projectName: string): string {
  const safe = `${accountId}-${projectName}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
  return `vx-${safe}`;
}
