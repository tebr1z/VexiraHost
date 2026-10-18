type ManagedContainerRunOptions = {
  name: string;
  image: string;
  accountId: string;
  envFile: string;
  containerPort: number;
  hostPort?: number;
  bindHost?: "127.0.0.1" | "0.0.0.0";
  candidate?: boolean;
  limits?: { cpuPercent: number; memoryMb: number };
  cgroupParent?: string;
  dataPath?: string;
  linuxUser?: string;
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildManagedContainerRunCommand(options: ManagedContainerRunOptions): string {
  const cpu = options.limits?.cpuPercent ?? 100;
  const memory = options.limits?.memoryMb ?? 1024;
  if (options.linuxUser && !/^vx[a-z0-9]{1,29}$/.test(options.linuxUser))
    throw new Error("Invalid tenant user");
  if (
    !Number.isInteger(cpu) ||
    cpu < 10 ||
    cpu > 3200 ||
    !Number.isInteger(memory) ||
    memory < 128 ||
    memory > 262144
  )
    throw new Error("Invalid container resource limits");
  const publish =
    options.hostPort == null
      ? `-p ${options.bindHost ?? "127.0.0.1"}::${options.containerPort}`
      : `-p ${options.bindHost ?? "127.0.0.1"}:${options.hostPort}:${options.containerPort}`;

  return [
    "docker run -d",
    `--name ${shellQuote(options.name)}`,
    `--restart ${options.candidate ? "no" : "unless-stopped"}`,
    "--log-driver local",
    "--log-opt max-size=10m",
    "--log-opt max-file=3",
    "--cap-drop ALL",
    "--security-opt no-new-privileges:true",
    "--pids-limit 256",
    `--memory ${memory}m --memory-swap ${memory}m`,
    `--cpus ${cpu / 100}`,
    ...(options.cgroupParent ? [`--cgroup-parent ${shellQuote(options.cgroupParent)}`] : []),
    options.linuxUser
      ? `--read-only --user "$(id -u ${shellQuote(options.linuxUser)}):$(id -g ${shellQuote(options.linuxUser)})"`
      : "--read-only --user 65532:65532",
    "--tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m",
    ...(options.dataPath
      ? [`--mount ${shellQuote(`type=bind,src=${options.dataPath},dst=/data`)}`]
      : []),
    "--label com.vexira.managed=true",
    `--label ${shellQuote(`com.vexira.account=${options.accountId}`)}`,
    `--label ${shellQuote(`com.vexira.container=${options.name}`)}`,
    publish,
    `--env-file ${shellQuote(options.envFile)}`,
    `-e PORT=${options.containerPort}`,
    shellQuote(options.image),
  ].join(" ");
}

export function parseDockerPublishedPort(output: string): number {
  const line = output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  const match = line?.match(/:(\d+)$/);
  const port = Number(match?.[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Docker did not report a valid candidate port");
  }
  return port;
}

/**
 * A remote POSIX-shell probe. Any HTTP response except proxy-style 502/503/504
 * proves that the web process is reachable; 401/403/404 are valid app responses.
 */
export function buildContainerReadinessCommand(input: {
  name: string;
  containerPort: number;
  hostPort?: number;
  attempts?: number;
}): string {
  const portSetup =
    input.hostPort == null
      ? `PORT_VALUE="$(docker port ${shellQuote(input.name)} ${input.containerPort}/tcp 2>/dev/null | tail -n 1 | awk -F: '{print $NF}')"`
      : `PORT_VALUE=${input.hostPort}`;
  const attempts = Math.max(1, Math.min(input.attempts ?? 30, 60));

  return [
    portSetup,
    `test -n "$PORT_VALUE" || { echo 'No published candidate port'; exit 1; }`,
    "attempt=1",
    `while [ "$attempt" -le ${attempts} ]; do`,
    `  state="$(docker inspect -f '{{.State.Status}}' ${shellQuote(input.name)} 2>/dev/null || echo missing)"`,
    '  if [ "$state" != running ]; then',
    `    echo "Container stopped during readiness check: $state"; docker logs --tail 80 ${shellQuote(input.name)} 2>&1 || true; exit 1`,
    "  fi",
    "  for path in / /api /api/v1 /health /api/health /api/v1/health; do",
    '    code="$(curl -s -o /dev/null -w \'%{http_code}\' --connect-timeout 2 --max-time 5 "http://127.0.0.1:$PORT_VALUE$path" 2>/dev/null || true)"',
    '    case "$code" in \'\'|000|502|503|504) ;; *) echo "Ready: HTTP $code on $path"; exit 0 ;; esac',
    "  done",
    "  attempt=$((attempt + 1))",
    "  sleep 2",
    "done",
    `echo 'Readiness check timed out'; docker logs --tail 80 ${shellQuote(input.name)} 2>&1 || true; exit 1`,
  ].join("\n");
}
