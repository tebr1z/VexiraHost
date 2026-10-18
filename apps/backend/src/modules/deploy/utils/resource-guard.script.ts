export const RESOURCE_GUARD_VERSION = "1";

/**
 * A deliberately small host-side watchdog. Linux cgroup v2 and XFS enforce the
 * limits immediately; this service periodically reasserts them and kills any
 * tenant process that somehow started outside its assigned aggregate slice.
 */
export const RESOURCE_GUARD_SCRIPT = `#!/bin/bash
# vexira-resource-guard-version: ${RESOURCE_GUARD_VERSION}
set -uo pipefail

MANIFEST_DIR=/var/lib/vexira/tenants

guard_log() {
  logger -t vexira-resource-guard -- "$*"
}

stop_tenant() {
  local slice="$1"
  local reason="$2"
  systemctl stop "$slice" >/dev/null 2>&1 || true
  guard_log "blocked $slice: $reason"
}

install -d -m 700 "$MANIFEST_DIR"
shopt -s nullglob

for manifest in "$MANIFEST_DIR"/*.tenant; do
  IFS=$'\\t' read -r account user slice root cpu memory disk project_id < "$manifest" || true

  if [[ ! "$account" =~ ^[A-Za-z0-9_-]{1,80}$ ]] ||
     [[ ! "$user" =~ ^[a-z_][a-z0-9_-]{0,30}$ ]] ||
     [[ ! "$slice" =~ ^vexira-[a-f0-9]{24}\\.slice$ ]] ||
     [[ ! "$root" =~ ^/[A-Za-z0-9_/-]+$ ]] ||
     [[ ! "$cpu" =~ ^[0-9]+$ ]] || [[ ! "$memory" =~ ^[0-9]+$ ]] ||
     [[ ! "$disk" =~ ^[0-9]+$ ]] || [[ ! "$project_id" =~ ^[0-9]+$ ]]; then
    guard_log "ignored invalid manifest: $manifest"
    continue
  fi

  if ! id -u "$user" >/dev/null 2>&1 || [ ! -d "$root" ]; then
    stop_tenant "$slice" "tenant user or workspace is missing"
    continue
  fi

  if [ ! -f /sys/fs/cgroup/cgroup.controllers ] ||
     ! grep -qw cpu /sys/fs/cgroup/cgroup.controllers ||
     ! grep -qw memory /sys/fs/cgroup/cgroup.controllers; then
    stop_tenant "$slice" "cgroup v2 CPU/RAM enforcement is unavailable"
    continue
  fi

  mount_point=$(findmnt -n -o TARGET -T "$root" 2>/dev/null || true)
  fs_type=$(findmnt -n -o FSTYPE -T "$root" 2>/dev/null || true)
  if [ "$fs_type" != xfs ] ||
     ! xfs_quota -x -c 'state -p' "$mount_point" 2>/dev/null | grep -q 'Enforcement: ON' ||
     ! xfs_quota -x -c 'state -u' "$mount_point" 2>/dev/null | grep -q 'Enforcement: ON'; then
    stop_tenant "$slice" "XFS hard quota enforcement is unavailable"
    continue
  fi

  memory_high=$((memory * 90 / 100))
  systemctl set-property --runtime "$slice" \
    "CPUQuota=$cpu%" "MemoryHigh=\${memory_high}M" "MemoryMax=\${memory}M" \
    MemorySwapMax=0 TasksMax=512 >/dev/null || {
      stop_tenant "$slice" "could not apply CPU/RAM limits"
      continue
    }

  xfs_quota -x -c "limit -p bsoft=\${disk}g bhard=\${disk}g ihard=200000 $project_id" "$mount_point" >/dev/null 2>&1 || {
    stop_tenant "$slice" "could not apply project disk quota"
    continue
  }
  xfs_quota -x -c "limit -u bsoft=\${disk}g bhard=\${disk}g ihard=200000 $user" "$mount_point" >/dev/null 2>&1 || {
    stop_tenant "$slice" "could not apply user disk quota"
    continue
  }

  while read -r pid; do
    [ -n "$pid" ] && [ -r "/proc/$pid/cgroup" ] || continue
    if ! grep -Fq "/$slice" "/proc/$pid/cgroup"; then
      guard_log "terminating escaped tenant process account=$account pid=$pid"
      kill -TERM "$pid" >/dev/null 2>&1 || true
      sleep 0.05
      kill -KILL "$pid" >/dev/null 2>&1 || true
    fi
  done < <(ps -u "$user" -o pid= 2>/dev/null)
done
`;

export const RESOURCE_GUARD_SERVICE = `[Unit]
Description=Vexira tenant resource limit guard
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/vexira-resource-guard
Nice=10
IOSchedulingClass=idle
`;

export const RESOURCE_GUARD_TIMER = `[Unit]
Description=Continuously verify Vexira tenant CPU, RAM and SSD limits

[Timer]
OnBootSec=30s
OnUnitActiveSec=30s
AccuracySec=5s
Persistent=true
Unit=vexira-resource-guard.service

[Install]
WantedBy=timers.target
`;
