import type { DeployStack } from "@prisma/client";

export function defaultContainerPort(_stack: DeployStack): number {
  return 3000;
}

/** Default pnpm major for Alpine builds (corepack is unreliable under podman). */
const PNPM_VERSION = "9.15.0";

export type DockerfileOptions = {
  /** Workspace app path inside the repo, e.g. `apps/frontend` */
  appSubdir?: string;
  /** Repo root has pnpm-workspace.yaml / yarn workspaces */
  monorepo?: boolean;
};

export function sanitizeAppSubdir(dir: string | null | undefined): string {
  const cleaned = (dir ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned) return ".";
  if (cleaned.includes("..") || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(cleaned)) {
    throw new Error("Invalid monorepo path");
  }
  return cleaned;
}

function installPnpm(): string {
  return `RUN npm install -g pnpm@${PNPM_VERSION}`;
}

function installDepsLines(): string {
  return `${installPnpm()}
RUN if [ -f pnpm-lock.yaml ]; then pnpm install; \\
  elif [ -f yarn.lock ]; then npm install -g yarn && yarn install; \\
  elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; \\
  else npm install; fi`;
}

function installProdDepsLines(): string {
  return `${installPnpm()}
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --prod; \\
  elif [ -f yarn.lock ]; then npm install -g yarn && yarn install --production; \\
  elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci --omit=dev; \\
  else npm install --omit=dev; fi`;
}

function runBuildInDir(appDir: string, monorepo: boolean): string {
  if (monorepo && appDir !== ".") {
    // Turbo respects ^build — compiles @vexira/* packages before Next/Nest app
    return `RUN pnpm exec turbo run build --filter=./${appDir}...`;
  }
  return `RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; \\
  elif [ -f yarn.lock ]; then yarn run build; \\
  else npm run build; fi`;
}

function appPath(prefix: string, appDir: string, suffix: string): string {
  return appDir === "." ? `${prefix}${suffix}` : `${prefix}/${appDir}${suffix}`;
}

function buildMonorepoNestDockerfile(appDir: string): string {
  const distPath = appPath("/app", appDir, "/dist");
  return `FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
${installDepsLines()}
ENV CI=true
ENV TURBO_TELEMETRY_DISABLED=1
${runBuildInDir(appDir, true)}

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder ${distPath} ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
`;
}

function buildSinglePackageNestDockerfile(): string {
  return `FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* ./
${installDepsLines()}
COPY . .
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; \\
  elif [ -f yarn.lock ]; then yarn run build; \\
  else npm run build; fi

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* ./
${installProdDepsLines()}
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
`;
}

function buildMonorepoNextDockerfile(appDir: string): string {
  const publicPath = appPath("/app", appDir, "/public");
  const standalonePath = appPath("/app", appDir, "/.next/standalone");
  const staticPath = appPath("/app", appDir, "/.next/static");
  const publicDest = appDir === "." ? "./public" : `./${appDir}/public`;
  const staticDest = appDir === "." ? "./.next/static" : `./${appDir}/.next/static`;
  const serverEntry = appDir === "." ? "server.js" : `${appDir}/server.js`;

  return `FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
${installDepsLines()}
ENV CI=true
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
${runBuildInDir(appDir, true)}

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder ${standalonePath} ./
COPY --from=builder ${staticPath} ${staticDest}
COPY --from=builder ${publicPath} ${publicDest}
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "${serverEntry}"]
`;
}

function buildSinglePackageNextDockerfile(): string {
  return `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* ./
${installDepsLines()}

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

export function buildDockerfile(stack: DeployStack, options: DockerfileOptions = {}): string {
  const appDir = sanitizeAppSubdir(options.appSubdir);
  const monorepo = Boolean(options.monorepo);

  if (stack === "NESTJS") {
    return monorepo ? buildMonorepoNestDockerfile(appDir) : buildSinglePackageNestDockerfile();
  }

  return monorepo ? buildMonorepoNextDockerfile(appDir) : buildSinglePackageNextDockerfile();
}

export function buildDockerComposeProjectName(accountId: string, projectName: string): string {
  const safe = `${accountId}-${projectName}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
  return `vx-${safe}`;
}

export const MONOREPO_ROOT_MANIFEST_FILES = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "package-lock.json",
  "yarn.lock",
  "turbo.json",
] as const;
