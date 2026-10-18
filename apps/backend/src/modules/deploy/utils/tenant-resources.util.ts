import { createHash, randomUUID } from "node:crypto";

import { buildDeployLinuxUser, shellQuote as q } from "./deploy-user.util";

export type TenantLimits = { cpuPercent: number; memoryMb: number; diskGb: number };
export const TENANT_PARENT_SLICE =
  "[Unit]\nDescription=Vexira workloads with host headroom\n[Slice]\nCPUAccounting=yes\nMemoryAccounting=yes\nMemoryMax=80%\nMemorySwapMax=0\nTasksMax=8192\n";

export function validateTenantLimits(limits: TenantLimits): TenantLimits {
  for (const [key, min, max] of [
    ["cpuPercent", 10, 3200],
    ["memoryMb", 128, 262144],
    ["diskGb", 1, 1048576],
  ] as const) {
    if (!Number.isInteger(limits[key]) || limits[key] < min || limits[key] > max)
      throw new Error(`Invalid tenant ${key}`);
  }
  return limits;
}

export function tenantIdentity(accountId: string, basePath: string) {
  if (
    !/^[a-zA-Z0-9_-]{1,80}$/.test(accountId) ||
    !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(basePath) ||
    basePath.split("/").length < 4
  ) {
    throw new Error("Unsafe tenant workspace path");
  }
  const hash = createHash("sha256").update(accountId).digest("hex");
  return {
    user: buildDeployLinuxUser(accountId),
    root: `${basePath}/${accountId}`,
    slice: `vexira-${hash.slice(0, 24)}.slice`,
    projectId: Number.parseInt(hash.slice(0, 7), 16) + 10000,
  };
}

export function tenantSliceContent(limits: TenantLimits): string {
  validateTenantLimits(limits);
  const memoryHighMb = Math.max(1, Math.floor(limits.memoryMb * 0.9));
  return `[Unit]\nDescription=Vexira tenant aggregate resource budget\n[Slice]\nCPUAccounting=yes\nMemoryAccounting=yes\nTasksAccounting=yes\nCPUQuota=${limits.cpuPercent}%\nMemoryHigh=${memoryHighMb}M\nMemoryMax=${limits.memoryMb}M\nMemorySwapMax=0\nTasksMax=512\n`;
}

/** Native XFS project quotas: no formatting/remounting and no advisory-only fallback. */
export function buildTenantPrepareCommand(
  accountId: string,
  basePath: string,
  limits: TenantLimits,
): string {
  validateTenantLimits(limits);
  const { root, user, projectId, slice } = tenantIdentity(accountId, basePath);
  return [
    "set -eu",
    "test \"$(id -u)\" = 0 || { echo 'Root SSH is required' >&2; exit 60; }",
    "test -f /sys/fs/cgroup/cgroup.controllers && grep -qw cpu /sys/fs/cgroup/cgroup.controllers && grep -qw memory /sys/fs/cgroup/cgroup.controllers || { echo 'cgroup v2 CPU/memory controllers are required' >&2; exit 61; }",
    "command -v systemd-run >/dev/null && command -v xfs_quota >/dev/null && command -v xfs_io >/dev/null && command -v flock >/dev/null || { echo 'Install systemd, xfsprogs and util-linux first' >&2; exit 62; }",
    `mkdir -p ${q(basePath)}`,
    `test "$(readlink -f ${q(basePath)})" = ${q(basePath)} || { echo 'Deploy base must not be a symlink' >&2; exit 63; }`,
    `MOUNT=$(findmnt -n -o TARGET -T ${q(basePath)}); FS=$(findmnt -n -o FSTYPE -T ${q(basePath)})`,
    `test "$FS" = xfs && xfs_quota -x -c 'state -p' "$MOUNT" | grep -q 'Enforcement: ON' || { echo 'Auto Deploy requires an XFS volume with project quota enforcement enabled (prjquota). No disk was formatted or remounted.' >&2; exit 64; }`,
    `xfs_quota -x -c 'state -u' "$MOUNT" | grep -q 'Enforcement: ON' || { echo 'XFS user quota enforcement (uquota) is also required to prevent project-ID tampering' >&2; exit 64; }`,
    `test ! -L ${q(root)} || exit 63`,
    `mkdir -p ${q(root)}`,
    `chown root:root ${q(basePath)}; chmod 755 ${q(basePath)}`,
    "install -d -m 700 /var/lib/vexira/linux-users",
    `( flock -x 9; REG=/var/lib/vexira/linux-users/${user}; if [ -e "$REG" ]; then test "$(cat "$REG")" = ${q(accountId)} || { echo 'Tenant Linux user collision; provisioning stopped' >&2; exit 65; }; elif id -u ${q(user)} >/dev/null 2>&1; then test "$(getent passwd ${q(user)} | cut -d: -f6)" = ${q(`${root}/.home`)} || { echo 'Existing unregistered Linux user requires administrator migration; refusing to reuse it' >&2; exit 66; }; fi; printf '%s' ${q(accountId)} > "$REG" ) 9>/var/lib/vexira/linux-users/lock`,
    `id -u ${q(user)} >/dev/null 2>&1 || useradd --system --user-group --no-create-home --home-dir ${q(`${root}/.home`)} --shell /usr/sbin/nologin ${q(user)}`,
    `test "$(id -u ${q(user)})" != 0 || { echo 'Tenant must not be root' >&2; exit 66; }`,
    `if id -nG ${q(user)} | tr ' ' '\\n' | grep -Eq '^(root|docker|sudo|wheel)$'; then echo 'Tenant belongs to a privileged group' >&2; exit 66; fi`,
    `chown root:${user} ${q(root)}; chmod 750 ${q(root)}`,
    `test ! -L ${q(`${root}/.home`)} || exit 63`,
    `install -d -o ${q(user)} -g ${q(user)} -m 700 ${q(`${root}/.home`)}`,
    // Reserve the project ID under a host-wide lock. Never take over another tenant's quota.
    "install -d -m 700 /var/lib/vexira/project-ids",
    `( flock -x 9; REG=/var/lib/vexira/project-ids/${projectId}; if [ -e "$REG" ]; then test "$(cat "$REG")" = ${q(accountId)} || { echo 'Project quota ID collision; provisioning stopped' >&2; exit 65; }; elif xfs_quota -x -c 'report -p -b -n -N' "$MOUNT" | awk -v wanted=${projectId} '{gsub(/^#/, "", $1); if ($1 == wanted) found=1} END {exit !found}'; then echo 'Project quota ID is already used outside Vexira; provisioning stopped' >&2; exit 65; fi; printf '%s' ${q(accountId)} > "$REG" ) 9>/var/lib/vexira/project-ids/lock`,
    `xfs_quota -x -c ${q(`project -s -p ${root} ${projectId}`)} "$MOUNT"`,
    `xfs_quota -x -c ${q(`limit -p bsoft=${limits.diskGb}g bhard=${limits.diskGb}g ihard=200000 ${projectId}`)} "$MOUNT"`,
    `xfs_quota -x -c ${q(`limit -u bsoft=${limits.diskGb}g bhard=${limits.diskGb}g ihard=200000 ${user}`)} "$MOUNT"`,
    "install -d -m 700 /var/lib/vexira/tenants",
    `printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' ${q(accountId)} ${q(user)} ${q(slice)} ${q(root)} ${limits.cpuPercent} ${limits.memoryMb} ${limits.diskGb} ${projectId} > ${q(`/var/lib/vexira/tenants/${slice}.tenant`)}`,
    `chmod 600 ${q(`/var/lib/vexira/tenants/${slice}.tenant`)}`,
    // Keep tenant cgroups below a host-wide budget; leave headroom for Plesk/OS.
    `systemctl daemon-reload && systemctl start ${q(slice)}`,
    `systemctl set-property vexira.slice MemoryMax=80% MemorySwapMax=0 TasksMax=8192 CPUQuota="$(( $(getconf _NPROCESSORS_ONLN) * 80 ))%"`,
    `systemctl set-property ${q(slice)} CPUQuota=${limits.cpuPercent}% MemoryHigh=${Math.max(1, Math.floor(limits.memoryMb * 0.9))}M MemoryMax=${limits.memoryMb}M MemorySwapMax=0 TasksMax=512`,
    "echo 'Tenant cgroup and enforced project quota prepared'",
  ].join("\n");
}

/** Both builds and runtime execute unprivileged inside the same aggregate cgroup. */
export function buildTenantRunCommand(input: {
  accountId: string;
  basePath: string;
  command: string;
  runtimeName?: string;
}): string {
  const { user, root, slice } = tenantIdentity(input.accountId, input.basePath);
  const unit = input.runtimeName
    ? tenantRuntimeUnit(input.runtimeName)
    : `vxbuild-${randomUUID()}.service`;
  return [
    "systemd-run",
    input.runtimeName ? "--collect" : "--wait --pipe --collect",
    `--unit=${q(unit)} --slice=${q(slice)} --service-type=exec`,
    `--property=${q(`User=${user}`)} --property=${q(`Group=${user}`)}`,
    "--property=NoNewPrivileges=yes --property=ProtectSystem=strict --property=ProtectHome=yes --property=MemoryOOMGroup=yes",
    "--property=PrivateTmp=yes --property=PrivateDevices=yes --property=ProtectControlGroups=yes",
    "--property=ProtectKernelTunables=yes --property=ProtectKernelModules=yes --property=RestrictSUIDSGID=yes --property=ProtectProc=invisible",
    "--property=RestrictNamespaces=yes --property=CapabilityBoundingSet= --property=UMask=0077",
    `--property=${q(`ReadWritePaths=${root}`)} --property=${q(`WorkingDirectory=${root}`)}`,
    `--setenv=${q(`HOME=${root}/.home`)} --setenv=${q(`PM2_HOME=${root}/.home/.pm2`)}`,
    `--setenv=${q(`npm_config_cache=${root}/.home/.npm`)} --setenv=${q(`XDG_CACHE_HOME=${root}/.home/.cache`)}`,
    // Private tmpfs cannot fill the host filesystem; it is charged to MemoryMax.
    "--property=TemporaryFileSystem=/tmp:rw,nosuid,nodev,size=64M",
    ...(input.runtimeName
      ? ["--property=Restart=on-failure --property=RestartSec=3s --property=RuntimeMaxSec=infinity"]
      : ["--property=RuntimeMaxSec=900 --property=KillMode=control-group"]),
    `/bin/sh -c ${q(input.command)}`,
  ].join(" ");
}

export function tenantRuntimeUnit(name: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(name)) throw new Error("Invalid managed runtime name");
  return `vxapp-${name}.service`;
}

export function tenantRuntimeServiceContent(
  accountId: string,
  basePath: string,
  command: string,
  runtimeName = "app",
): string {
  const { root, user, slice } = tenantIdentity(accountId, basePath);
  tenantRuntimeUnit(runtimeName);
  const escaped = command
    .replace(/%/g, "%%")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
  return `[Unit]\nDescription=Vexira isolated PM2 application\nAfter=network.target\n[Service]\nType=exec\nUser=${user}\nGroup=${user}\nSlice=${slice}\nWorkingDirectory=${root}\nEnvironment=HOME=${root}/.home PM2_HOME=${root}/.home/.pm2-${runtimeName} npm_config_cache=${root}/.home/.npm XDG_CACHE_HOME=${root}/.home/.cache\nExecStart=/bin/sh -c "${escaped}"\nRestart=on-failure\nRestartSec=3\nKillMode=control-group\nMemoryOOMGroup=yes\nLogRateLimitIntervalSec=30s\nLogRateLimitBurst=200\nNoNewPrivileges=yes\nProtectSystem=strict\nProtectHome=yes\nPrivateTmp=yes\nPrivateDevices=yes\nProtectControlGroups=yes\nProtectKernelTunables=yes\nProtectKernelModules=yes\nProtectProc=invisible\nRestrictSUIDSGID=yes\nRestrictNamespaces=yes\nCapabilityBoundingSet=\nUMask=0077\nReadWritePaths=${root}\nTemporaryFileSystem=/tmp:rw,nosuid,nodev,size=64M\n[Install]\nWantedBy=multi-user.target\n`;
}

export function buildTenantMetricsCommand(accountId: string, basePath: string): string {
  const { root, slice, user } = tenantIdentity(accountId, basePath);
  return [
    `CG=$(systemctl show ${q(slice)} --property=ControlGroup --value 2>/dev/null)`,
    `if [ -z "$CG" ] || [ ! -r "/sys/fs/cgroup$CG/memory.current" ]; then echo VX_READY=0; exit 0; fi`,
    "echo VX_READY=1",
    `printf 'VX_MEMORY='; cat "/sys/fs/cgroup$CG/memory.current"`,
    `printf 'VX_CPU='; awk '$1=="usage_usec" {print $2}' "/sys/fs/cgroup$CG/cpu.stat"`,
    `printf 'VX_UPTIME='; cut -d' ' -f1 /proc/uptime`,
    `printf 'VX_MEMORY_MAX='; cat "/sys/fs/cgroup$CG/memory.max"`,
    `printf 'VX_CPU_MAX='; cat "/sys/fs/cgroup$CG/cpu.max"`,
    `MOUNT=$(findmnt -n -o TARGET -T ${q(root)})`,
    `xfs_quota -x -c ${q(`quota -u -b -N ${user}`)} "$MOUNT" 2>/dev/null | awk '$2 ~ /^[0-9]+$/ && $4 ~ /^[0-9]+$/ {print "VX_DISK_KB=" $2; print "VX_DISK_MAX_KB=" $4}'`,
  ].join("\n");
}

export function parseTenantMetrics(output: string) {
  const number = (key: string) => {
    const raw = output.match(new RegExp(`^${key}=(\\d+(?:\\.\\d+)?)$`, "m"))?.[1];
    return raw === undefined ? null : Number(raw);
  };
  const cpuMax = output.match(/^VX_CPU_MAX=(\d+) (\d+)$/m);
  return {
    ready: number("VX_READY") === 1,
    memoryBytes: number("VX_MEMORY"),
    cpuUsec: number("VX_CPU"),
    uptimeSeconds: number("VX_UPTIME"),
    diskBytes: number("VX_DISK_KB") == null ? null : number("VX_DISK_KB")! * 1024,
    appliedMemoryMb: number("VX_MEMORY_MAX") == null ? null : number("VX_MEMORY_MAX")! / 1024 ** 2,
    appliedCpuPercent: cpuMax ? (Number(cpuMax[1]) / Number(cpuMax[2])) * 100 : null,
    appliedDiskGb: number("VX_DISK_MAX_KB") == null ? null : number("VX_DISK_MAX_KB")! / 1024 ** 2,
  };
}
