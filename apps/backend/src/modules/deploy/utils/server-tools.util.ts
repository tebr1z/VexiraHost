export const TOOLS_PROBE_COMMAND = [
  'echo "GIT=$(git --version 2>/dev/null || echo missing)"',
  'echo "DOCKER=$(docker --version 2>/dev/null || echo missing)"',
  'echo "COMPOSE=$(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo missing)"',
].join("; ");

export function parseProbeLine(output: string, key: string): string | null {
  const match = output.match(new RegExp(`${key}=(.+)$`, "m"));
  const value = match?.[1]?.trim();
  if (!value || value === "missing") return null;
  return value;
}

export function isDeployToolPresent(value: string | null): boolean {
  return Boolean(value && !value.includes("missing"));
}
