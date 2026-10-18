export const TOOLS_PROBE_COMMAND = [
  'echo "GIT=$(git --version 2>/dev/null || echo missing)"',
  'echo "DOCKER=$(docker --version 2>/dev/null || echo missing)"',
  'echo "COMPOSE=$(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo missing)"',
  'echo "NODE=$(node --version 2>/dev/null || echo missing)"',
  'echo "NPM=$(npm --version 2>/dev/null || echo missing)"',
  'echo "PM2=$(pm2 --version 2>/dev/null || echo missing)"',
  `echo "CPU_PERCENT=$(awk -v l=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null || echo 0) -v c=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1) 'BEGIN { printf "%d", (l/c)*100 }')"`,
  "echo \"MEM_USED_MB=$(free -m 2>/dev/null | awk '/^Mem:/ {print $3}' || echo 0)\"",
  "echo \"MEM_TOTAL_MB=$(free -m 2>/dev/null | awk '/^Mem:/ {print $2}' || echo 0)\"",
  "echo \"DISK_USED_MB=$(df -Pm / 2>/dev/null | awk 'NR==2 {print $3}' || echo 0)\"",
  "echo \"DISK_TOTAL_MB=$(df -Pm / 2>/dev/null | awk 'NR==2 {print $2}' || echo 0)\"",
  'echo "UPTIME_SECONDS=$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0)"',
].join("; ");

export function parseProbeLine(output: string, key: string): string | null {
  const match = output.match(new RegExp(`${key}=(.+)$`, "m"));
  const value = match?.[1]?.trim();
  if (!value || value === "missing") return null;
  return value;
}

export function parseProbeNumber(output: string, key: string): number | null {
  const value = parseProbeLine(output, key);
  if (!value || !/^\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

export function isDeployToolPresent(value: string | null): boolean {
  return Boolean(value && !value.includes("missing"));
}
