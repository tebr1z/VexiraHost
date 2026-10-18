/** Stable, non-privileged Linux account used to isolate one customer's PM2 builds/processes. */
export function buildDeployLinuxUser(accountId: string): string {
  const normalized = accountId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  return `vx${normalized || "deploy"}`.slice(0, 31);
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function runAsDeployUser(user: string, command: string): string {
  return `runuser -u ${shellQuote(user)} -- sh -lc ${shellQuote(command)}`;
}
