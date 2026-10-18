import { buildDockerfile, buildDockerignore, sanitizeAppSubdir } from "./docker-templates.util";

describe("docker deploy templates", () => {
  it("creates a production-only NestJS monorepo runtime image", () => {
    const dockerfile = buildDockerfile("NESTJS", {
      monorepo: true,
      appSubdir: "apps/backend",
    });

    expect(dockerfile).toContain("pnpm --filter ./apps/backend deploy --prod /prod/app");
    expect(dockerfile).toContain("COPY --from=builder --chown=node:node /prod/app ./");
    expect(dockerfile).toContain("/prod/app/node_modules/.prisma");
    expect(dockerfile).not.toContain("COPY --from=builder /app/node_modules");
    expect(dockerfile).toContain("USER node");
  });

  it("creates a Next.js standalone runtime and injects build env as a secret", () => {
    const dockerfile = buildDockerfile("NEXTJS", {
      monorepo: true,
      appSubdir: "apps/frontend",
    });

    expect(dockerfile).toContain(
      "--mount=type=secret,id=app_env,target=/app/apps/frontend/.env.production",
    );
    expect(dockerfile).toContain("/app/apps/frontend/.next/standalone");
    expect(dockerfile).toContain('CMD ["node", "apps/frontend/server.js"]');
    expect(dockerfile).toContain("USER node");
  });

  it("excludes dependencies, build output and secrets from build context", () => {
    const dockerignore = buildDockerignore();

    expect(dockerignore).toContain("**/node_modules");
    expect(dockerignore).toContain("**/dist");
    expect(dockerignore).toContain("**/.env.*");
  });

  it("rejects traversal in app paths", () => {
    expect(() => sanitizeAppSubdir("../backend")).toThrow("Invalid monorepo path");
  });
});
