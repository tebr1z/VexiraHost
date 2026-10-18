import type { DeployStack } from "@prisma/client";

export function defaultContainerPort(stack: DeployStack): number {
  return stack === "DOTNET" ? 8080 : 3000;
}

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

/** Small, secret-safe build context even when the customer repo has no .dockerignore. */
export function buildDockerignore(): string {
  return [
    ".git",
    ".github",
    ".gitlab",
    ".idea",
    ".vscode",
    ".turbo",
    "**/.turbo",
    "node_modules",
    "**/node_modules",
    ".next",
    "**/.next",
    "dist",
    "**/dist",
    "coverage",
    "**/coverage",
    "test-results",
    "**/test-results",
    "playwright-report",
    "**/playwright-report",
    "*.log",
    "**/*.log",
    ".env",
    ".env.*",
    "**/.env",
    "**/.env.*",
    "Dockerfile*",
    "docker-compose*.yml",
    "docker-compose*.yaml",
  ].join("\n");
}

function installPnpm(): string {
  return `RUN npm install -g pnpm@${PNPM_VERSION}`;
}

function installDepsLines(): string {
  return `${installPnpm()}
RUN --mount=type=cache,id=vexira-pnpm-store,target=/pnpm/store \\
  if [ -f pnpm-lock.yaml ]; then pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile; \\
  elif [ -f yarn.lock ]; then npm install -g yarn && yarn install --frozen-lockfile; \\
  elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; \\
  else npm install; fi`;
}

function runBuildInDir(appDir: string, monorepo: boolean, nextEnvTarget?: string): string {
  const mount = nextEnvTarget
    ? `--mount=type=secret,id=app_env,target=${nextEnvTarget},required=false `
    : "";
  if (monorepo && appDir !== ".") {
    return `RUN ${mount}pnpm exec turbo run build --filter=./${appDir}...`;
  }
  return `RUN ${mount}if [ -f pnpm-lock.yaml ]; then pnpm run build; \\
  elif [ -f yarn.lock ]; then yarn run build; \\
  else npm run build; fi`;
}

/** Generate Prisma client when a schema exists (common Nest/Next layouts). */
function prismaGenerateLines(appDir = "."): string {
  const candidates =
    appDir === "."
      ? `prisma/schema.prisma prisma/schema`
      : `${appDir}/prisma/schema.prisma prisma/schema.prisma ${appDir}/prisma/schema`;
  return `RUN set -e; \\
  SCHEMA=""; \\
  for c in ${candidates}; do \\
    if [ -f "$c" ]; then SCHEMA="$c"; break; fi; \\
  done; \\
  if [ -n "$SCHEMA" ]; then \\
    echo "prisma generate --schema=$SCHEMA"; \\
    ok=0; \\
    for mirror in https://registry.npmmirror.com/-/binary/prisma https://cdn.npmmirror.com/binaries/prisma https://binaries.prisma.sh; do \\
      if PRISMA_ENGINES_MIRROR="$mirror" npx prisma generate --schema="$SCHEMA"; then ok=1; break; fi; \\
    done; \\
    test "$ok" = 1; \\
  else \\
    echo "No prisma schema found — skip generate"; \\
  fi`;
}

function alpinePrismaRuntimeDeps(): string {
  return `RUN apk add --no-cache openssl libc6-compat tini >/dev/null`;
}

function prismaEngineEnv(): string {
  return `ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_HIDE_UPDATE_MESSAGE=1`;
}

function alpinePrismaBuildDeps(): string {
  return `RUN apk add --no-cache openssl libc6-compat ca-certificates >/dev/null`;
}

function appPath(prefix: string, appDir: string, suffix: string): string {
  return appDir === "." ? `${prefix}${suffix}` : `${prefix}/${appDir}${suffix}`;
}

function buildMonorepoNestDockerfile(appDir: string): string {
  const distPath = appPath("/app", appDir, "/dist");
  const prismaPath = appPath("/app", appDir, "/prisma");
  return `# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
${alpinePrismaBuildDeps()}
${prismaEngineEnv()}
COPY . .
${installDepsLines()}
ENV CI=true
ENV TURBO_TELEMETRY_DISABLED=1
${prismaGenerateLines(appDir)}
${runBuildInDir(appDir, true)}
RUN pnpm --filter ./${appDir} deploy --prod /prod/app \\
 && rm -rf /prod/app/dist \\
 && cp -R ${distPath} /prod/app/dist \\
 && if [ -d ${prismaPath} ]; then rm -rf /prod/app/prisma && cp -R ${prismaPath} /prod/app/prisma; fi \\
 && PRISMA_CLIENT_DIR="$(find /app/node_modules -type d -name .prisma -print -quit)" \\
 && if [ -n "$PRISMA_CLIENT_DIR" ]; then find "$PRISMA_CLIENT_DIR" -type f -name '*.tmp*' -delete && rm -rf /prod/app/node_modules/.prisma && cp -R "$PRISMA_CLIENT_DIR" /prod/app/node_modules/.prisma; fi

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
${alpinePrismaRuntimeDeps()}
COPY --from=builder --chown=node:node /prod/app ./
USER node
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
`;
}

function buildSinglePackageNestDockerfile(): string {
  return `# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
${alpinePrismaBuildDeps()}
${prismaEngineEnv()}
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* ./
${installDepsLines()}
COPY . .
${prismaGenerateLines(".")}
${runBuildInDir(".", false)}
RUN mkdir -p /prod/app \\
 && if [ -f pnpm-lock.yaml ]; then pnpm --filter . deploy --prod /prod/app; \\
    elif [ -f yarn.lock ]; then cp package.json yarn.lock /prod/app/ && cd /prod/app && yarn install --production --frozen-lockfile; \\
    elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then cp package.json package-lock.json* npm-shrinkwrap.json* /prod/app/ && cd /prod/app && npm ci --omit=dev; \\
    else cp package.json /prod/app/ && cd /prod/app && npm install --omit=dev; fi \\
 && rm -rf /prod/app/dist \\
 && cp -R /app/dist /prod/app/dist \\
 && if [ -d /app/prisma ]; then rm -rf /prod/app/prisma && cp -R /app/prisma /prod/app/prisma; fi \\
 && PRISMA_CLIENT_DIR="$(find /app/node_modules -type d -name .prisma -print -quit)" \\
 && if [ -n "$PRISMA_CLIENT_DIR" ]; then find "$PRISMA_CLIENT_DIR" -type f -name '*.tmp*' -delete && rm -rf /prod/app/node_modules/.prisma && cp -R "$PRISMA_CLIENT_DIR" /prod/app/node_modules/.prisma; fi

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
${alpinePrismaRuntimeDeps()}
COPY --from=builder --chown=node:node /prod/app ./
USER node
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
`;
}

function buildMonorepoNextDockerfile(appDir: string): string {
  const publicPath = appPath("/app", appDir, "/public");
  const standalonePath = appPath("/app", appDir, "/.next/standalone");
  const staticPath = appPath("/app", appDir, "/.next/static");
  const envTarget = appPath("/app", appDir, "/.env.production");
  const publicDest = appDir === "." ? "./public" : `./${appDir}/public`;
  const staticDest = appDir === "." ? "./.next/static" : `./${appDir}/.next/static`;
  const serverEntry = appDir === "." ? "server.js" : `${appDir}/server.js`;

  return `# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
${installDepsLines()}
ENV CI=true
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p ${publicPath}
${runBuildInDir(appDir, true, envTarget)}

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat tini >/dev/null
COPY --from=builder --chown=node:node ${standalonePath} ./
COPY --from=builder --chown=node:node ${staticPath} ${staticDest}
COPY --from=builder --chown=node:node ${publicPath} ${publicDest}
USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "${serverEntry}"]
`;
}

function buildSinglePackageNextDockerfile(): string {
  return `# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* ./
${installDepsLines()}
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p /app/public
${runBuildInDir(".", false, "/app/.env.production")}

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat tini >/dev/null
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["/sbin/tini", "--"]
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
