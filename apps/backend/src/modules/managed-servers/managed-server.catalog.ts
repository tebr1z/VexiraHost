export const MANAGED_SERVER_FEATURES = [
  "GIT",
  "DOCKER",
  "NODEJS",
  "PM2",
  "NGINX",
  "UFW",
  "FAIL2BAN",
  "PLESK",
] as const;

export type ManagedServerFeature = (typeof MANAGED_SERVER_FEATURES)[number];

export const MANAGED_SERVER_PACKAGES = [
  {
    code: "WEB_APP",
    name: "Web App",
    description: "Node.js, PM2, Git, Nginx and basic firewall setup.",
    features: ["GIT", "NODEJS", "PM2", "NGINX", "UFW", "FAIL2BAN"],
  },
  {
    code: "CONTAINER",
    name: "Container",
    description: "Docker, Compose, Git and hardened network basics.",
    features: ["GIT", "DOCKER", "UFW", "FAIL2BAN"],
  },
  {
    code: "FULL_STACK",
    name: "Full Stack",
    description: "Node.js and Docker runtimes with PM2, Nginx and security tools.",
    features: ["GIT", "DOCKER", "NODEJS", "PM2", "NGINX", "UFW", "FAIL2BAN"],
  },
] as const satisfies ReadonlyArray<{
  code: string;
  name: string;
  description: string;
  features: readonly ManagedServerFeature[];
}>;

export function resolveManagedServerFeatures(
  packageCode: string,
  selected: readonly string[] = [],
): ManagedServerFeature[] {
  const bundle = MANAGED_SERVER_PACKAGES.find((item) => item.code === packageCode);
  const combined = [...(bundle?.features ?? []), ...selected];
  return Array.from(new Set(combined)).filter((value): value is ManagedServerFeature =>
    (MANAGED_SERVER_FEATURES as readonly string[]).includes(value),
  );
}

/** Only predefined scripts are executable; customer input is never interpolated here. */
export function buildFeatureInstallScript(feature: ManagedServerFeature): string {
  const packageInstall = (apt: string, dnf = apt) =>
    `if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y ${apt}; elif command -v dnf >/dev/null 2>&1; then dnf install -y ${dnf}; else echo 'Unsupported package manager' >&2; exit 40; fi`;

  const scripts: Record<ManagedServerFeature, string> = {
    GIT: packageInstall("git"),
    NODEJS: packageInstall("nodejs npm", "nodejs npm"),
    PM2: 'command -v npm >/dev/null 2>&1 || { echo \'npm is required before PM2\' >&2; exit 41; }; npm install -g pm2 && pm2 startup systemd -u "${SUDO_USER:-$USER}" --hp "${HOME}" || true',
    NGINX: `${packageInstall("nginx")} && systemctl enable --now nginx`,
    UFW: `${packageInstall("ufw", "firewalld")} && if command -v ufw >/dev/null 2>&1; then ufw allow OpenSSH && ufw --force enable; else systemctl enable --now firewalld; fi`,
    FAIL2BAN: `${packageInstall("fail2ban")} && systemctl enable --now fail2ban`,
    DOCKER: `${packageInstall("docker.io docker-compose-plugin", "docker docker-compose-plugin")} && systemctl enable --now docker`,
    PLESK:
      "command -v curl >/dev/null 2>&1 || { echo 'curl is required' >&2; exit 42; }; curl -fsSL https://autoinstall.plesk.com/one-click-installer | sh",
  };
  return `set -eu; ${scripts[feature]}`;
}
