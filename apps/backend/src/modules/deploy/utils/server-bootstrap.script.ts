import type { OsFamily } from "./server-os.util";

/** Remote bash script: detect OS, install/upgrade git + docker, keep packages current. */
export function buildServerBootstrapScript(preferredFamily?: OsFamily | null): string {
  const familyHint = preferredFamily ?? "";

  return `#!/bin/bash
set -euo pipefail

log() { echo "[vexira-bootstrap] $*"; }

if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
fi

OS_ID=\${ID:-unknown}
OS_VERSION=\${VERSION_ID:-}
OS_PRETTY=\${PRETTY_NAME:-\${OS_ID} \${OS_VERSION}}

echo "VX_OS_ID=\${OS_ID}"
echo "VX_OS_VERSION=\${OS_VERSION}"
echo "VX_OS_PRETTY=\${OS_PRETTY}"

resolve_family() {
  case "\${OS_ID}" in
    ubuntu|debian|linuxmint|pop) echo "debian" ;;
    almalinux|rocky|centos|rhel|fedora|ol) echo "rhel" ;;
    *) echo "unknown" ;;
  esac
}

FAMILY=$(resolve_family)
HINT="${familyHint}"

if [ "$FAMILY" = "unknown" ] && [ -n "$HINT" ]; then
  FAMILY="$HINT"
  log "Using admin OS hint: $FAMILY"
fi

if [ "$FAMILY" = "unknown" ]; then
  log "Unsupported OS: \${OS_ID} (\${OS_PRETTY})"
  exit 1
fi

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    log "git present: $(git --version)"
  else
    log "Installing git..."
  fi
}

ensure_docker_running() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable docker >/dev/null 2>&1 || true
    systemctl start docker >/dev/null 2>&1 || true
  elif command -v service >/dev/null 2>&1; then
    service docker start >/dev/null 2>&1 || true
  fi
}

ensure_node_pm2() {
  NODE_MAJOR=0
  if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  fi

  if [ "$NODE_MAJOR" -lt 22 ]; then
    log "Installing Node.js 22..."
    if [ "$FAMILY" = "debian" ]; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      apt-get install -y -qq nodejs
    else
      curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
      $PKG -y install nodejs
    fi
  fi

  log "Installing/upgrading PM2, pnpm and yarn..."
  npm install -g pm2@latest pnpm@9.15.0 yarn
  PM2_USER=$(id -un)
  PM2_HOME_DIR=$(getent passwd "$PM2_USER" | cut -d: -f6)
  pm2 startup systemd -u "$PM2_USER" --hp "$PM2_HOME_DIR" >/dev/null 2>&1 || true
}

bootstrap_debian() {
  export DEBIAN_FRONTEND=noninteractive
  log "Updating apt indexes..."
  apt-get update -qq

  log "Installing/upgrading base packages..."
  apt-get install -y -qq git curl unzip ca-certificates gnupg lsb-release xfsprogs util-linux

  if command -v docker >/dev/null 2>&1; then
    log "Upgrading docker packages..."
    apt-get install -y -qq docker.io docker-compose-plugin 2>/dev/null || \\
      apt-get install -y -qq docker.io docker-compose-v2 2>/dev/null || \\
      apt-get install -y -qq docker.io || true
  else
    log "Installing docker..."
    apt-get install -y -qq docker.io docker-compose-plugin 2>/dev/null || \\
      apt-get install -y -qq docker.io docker-compose-v2 2>/dev/null || \\
      apt-get install -y -qq docker.io
  fi

  ensure_docker_running
}

bootstrap_rhel() {
  PKG="dnf"
  if ! command -v dnf >/dev/null 2>&1; then
    PKG="yum"
  fi

  log "Refreshing $PKG metadata..."
  $PKG -y makecache || true

  log "Installing/upgrading base packages..."
  $PKG -y install git curl unzip ca-certificates xfsprogs util-linux yum-utils device-mapper-persistent-data lvm2 || \\
    $PKG -y install git curl unzip ca-certificates xfsprogs util-linux

  if command -v docker >/dev/null 2>&1; then
    log "Upgrading docker packages..."
    $PKG -y install docker docker-compose-plugin 2>/dev/null || \\
      $PKG -y upgrade docker 2>/dev/null || true
  else
    log "Installing docker..."
    $PKG -y install docker docker-compose-plugin 2>/dev/null || \\
      $PKG -y install docker 2>/dev/null || \\
      $PKG -y install moby-engine moby-compose 2>/dev/null || \\
      $PKG -y install docker
  fi

  ensure_docker_running
}

ensure_git

case "$FAMILY" in
  debian) bootstrap_debian ;;
  rhel) bootstrap_rhel ;;
  *) log "No bootstrap recipe for family=$FAMILY"; exit 1 ;;
esac

ensure_node_pm2

if ! command -v git >/dev/null 2>&1; then
  log "git is still missing after bootstrap"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  log "docker is still missing after bootstrap"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  log "docker daemon is not reachable"
  exit 1
fi

log "git: $(git --version)"
log "docker: $(docker --version)"
log "node: $(node --version)"
log "npm: $(npm --version)"
log "pm2: $(pm2 --version)"
echo "VX_BOOTSTRAP_OK=1"
`;
}

export const OS_DETECT_COMMAND = `if [ -f /etc/os-release ]; then . /etc/os-release; fi; printf 'VX_OS_ID=%s\\nVX_OS_VERSION=%s\\nVX_OS_PRETTY=%s\\n' "\${ID:-unknown}" "\${VERSION_ID:-}" "\${PRETTY_NAME:-}"`;
