/**
 * Customer .env must not override the container listen port — we always inject PORT.
 */
export function sanitizeDeployEnvVars(
  envVars: Record<string, string>,
  containerPort: number,
): { env: Record<string, string>; ignoredPort: string | null } {
  const env: Record<string, string> = {};
  let ignoredPort: string | null = null;

  for (const [rawKey, rawValue] of Object.entries(envVars)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (key.toUpperCase() === "PORT") {
      ignoredPort = String(rawValue);
      continue;
    }
    env[key] = String(rawValue);
  }

  env.PORT = String(containerPort);
  return { env, ignoredPort };
}

/** Strip PORT before persisting customer-provided env maps. */
export function stripCustomerPort(envVars: Record<string, string> | null | undefined): {
  env: Record<string, string>;
  ignoredPort: string | null;
} {
  const source = envVars ?? {};
  const env: Record<string, string> = {};
  let ignoredPort: string | null = null;
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (key.toUpperCase() === "PORT") {
      ignoredPort = String(rawValue);
      continue;
    }
    env[key] = String(rawValue);
  }
  return { env, ignoredPort };
}

/** Hide SSH user@ip:port from customer-facing deploy logs. */
export function redactSshTargets(text: string): string {
  return text.replace(
    /\b[A-Za-z0-9._-]+@(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,
    "hosting server",
  );
}

export function formatDeployBuildError(error: unknown): string {
  const raw = redactSshTargets(
    (error instanceof Error ? error.message : String(error))
      .replace(/x-access-token:[^@\s]+@/gi, "x-access-token:***@")
      .replace(/\/\/[^:@\s/]+:[^@\s/]+@/g, "//***:***@"),
  );

  const lower = raw.toLowerCase();
  if (
    lower.includes("no space left on device") ||
    lower.includes("enospc") ||
    lower.includes("disk quota exceeded")
  ) {
    return [
      "Docker/Podman build failed: no space left on device.",
      "Root (/) can still look free while /var or /var/tmp is full (Podman image layers).",
      "In Admin → Hosting Servers → Setup, probe storage, remove unused images (`docker image prune -a`), then redeploy.",
    ].join(" ");
  }

  if (
    lower.includes("binaries.prisma.sh") ||
    (lower.includes("prisma generate") && lower.includes("request to https://"))
  ) {
    return "Docker build failed downloading Prisma engines. Redeploy with the updated Nest image (engine mirrors + Docker cache kept).";
  }

  // Drop noisy podman/npm notices when a real Error: line exists.
  const errorLine = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Error:") || line.includes("no space left"));
  if (errorLine) return errorLine;

  return raw;
}
