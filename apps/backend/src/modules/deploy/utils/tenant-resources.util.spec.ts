import { buildManagedContainerRunCommand } from "./container-rollout.util";
import { RESOURCE_GUARD_SCRIPT, RESOURCE_GUARD_TIMER } from "./resource-guard.script";
import {
  buildTenantPrepareCommand,
  buildTenantRunCommand,
  buildTenantMetricsCommand,
  parseTenantMetrics,
  tenantIdentity,
  tenantRuntimeServiceContent,
  tenantSliceContent,
  validateTenantLimits,
} from "./tenant-resources.util";

const limits = { cpuPercent: 150, memoryMb: 2048, diskGb: 10 };
const base = "/var/www/vexira-deploy";

describe("tenant resource enforcement", () => {
  it("uses one aggregate slice per account, not one full budget per app", () => {
    const a = buildTenantRunCommand({
      accountId: "customer1",
      basePath: base,
      command: "npm run build",
    });
    const b = buildTenantRunCommand({
      accountId: "customer1",
      basePath: base,
      command: "npm install",
    });
    expect(a).toContain(tenantIdentity("customer1", base).slice);
    expect(b).toContain(tenantIdentity("customer1", base).slice);
    expect(tenantIdentity("customer2", base).slice).not.toBe(
      tenantIdentity("customer1", base).slice,
    );
  });
  it("uses hard CPU, RAM, swap and process limits", () => {
    expect(tenantSliceContent(limits)).toContain("CPUQuota=150%");
    expect(tenantSliceContent(limits)).toContain("MemoryHigh=1843M");
    expect(tenantSliceContent(limits)).toContain("MemoryMax=2048M");
    expect(tenantSliceContent(limits)).toContain("MemorySwapMax=0");
    expect(tenantSliceContent(limits)).toContain("TasksMax=512");
  });
  it("fails closed without native quota support and never formats/remounts", () => {
    const cmd = buildTenantPrepareCommand("customer1", base, limits);
    expect(cmd).toContain("Enforcement: ON");
    expect(cmd).toContain("exit 64");
    expect(cmd).toContain("bsoft=10g bhard=10g ihard=200000");
    expect(cmd).toContain("state -u");
    expect(cmd).toContain("limit -u bsoft=10g bhard=10g ihard=200000");
    expect(cmd).toContain("Project quota ID collision");
    expect(cmd).toContain("/var/lib/vexira/tenants/");
    expect(cmd).not.toMatch(/mkfs|mount -o|\/etc\/fstab/);
  });
  it("runs dependency/build scripts unprivileged with a read-only host filesystem", () => {
    const cmd = buildTenantRunCommand({
      accountId: "customer1",
      basePath: base,
      command: "npm ci && npm run build",
    });
    for (const setting of [
      "User=vxcustomer1",
      "NoNewPrivileges=yes",
      "ProtectSystem=strict",
      "ProtectHome=yes",
      "ProtectControlGroups=yes",
      "MemoryOOMGroup=yes",
      "CapabilityBoundingSet=",
      "RuntimeMaxSec=900",
      "KillMode=control-group",
      "size=64M",
    ])
      expect(cmd).toContain(setting);
    expect(cmd).not.toContain("User=root");
  });
  it("installs a low-overhead host guard that reasserts hard limits", () => {
    expect(RESOURCE_GUARD_SCRIPT).toContain('systemctl set-property --runtime "$slice"');
    expect(RESOURCE_GUARD_SCRIPT).toContain('xfs_quota -x -c "limit -p');
    expect(RESOURCE_GUARD_SCRIPT).toContain('kill -KILL "$pid"');
    expect(RESOURCE_GUARD_TIMER).toContain("OnUnitActiveSec=30s");
  });
  it("creates persistent PM2 services with a distinct PM2 home for each app", () => {
    const service = tenantRuntimeServiceContent(
      "customer1",
      base,
      "exec pm2-runtime start /app/ecosystem.config.cjs",
      "next-app",
    );
    expect(service).toContain("WantedBy=multi-user.target");
    expect(service).toContain(".pm2-next-app");
    expect(service).toContain("ProtectSystem=strict");
    expect(service).toContain("Slice=" + tenantIdentity("customer1", base).slice);
  });
  it.each(["../etc", "a; id", "a\nb", ""])("rejects unsafe account %s", (id) => {
    expect(() => tenantIdentity(id, base)).toThrow();
  });
  it.each(["/", "/etc", "/var/www/../etc", "/var/www/a;id"])("rejects unsafe base %s", (path) => {
    expect(() => tenantIdentity("customer1", path)).toThrow();
  });
  it.each([
    { ...limits, cpuPercent: 0 },
    { ...limits, memoryMb: 127 },
    { ...limits, diskGb: 0 },
    { ...limits, memoryMb: 1.5 },
  ])("rejects invalid limits %j", (value) => {
    expect(() => validateTenantLimits(value)).toThrow();
  });
  it("keeps missing metrics unknown rather than displaying zero usage", () => {
    expect(parseTenantMetrics("VX_READY=0")).toMatchObject({
      ready: false,
      memoryBytes: null,
      diskBytes: null,
      cpuUsec: null,
    });
  });
  it("parses real cgroup counters and applied budgets", () => {
    expect(
      parseTenantMetrics(
        "VX_READY=1\nVX_MEMORY=104857600\nVX_CPU=1234\nVX_UPTIME=123.45\nVX_MEMORY_MAX=2147483648\nVX_CPU_MAX=150000 100000\nVX_DISK_KB=1048576\nVX_DISK_MAX_KB=10485760",
      ),
    ).toMatchObject({
      ready: true,
      memoryBytes: 104857600,
      cpuUsec: 1234,
      uptimeSeconds: 123.45,
      appliedMemoryMb: 2048,
      appliedCpuPercent: 150,
      appliedDiskGb: 10,
      diskBytes: 1073741824,
    });
    expect(buildTenantMetricsCommand("customer1", base)).not.toContain("du -s");
  });
  it("gives .NET the same aggregate cgroup and bounded non-root persistent data", () => {
    const cmd = buildManagedContainerRunCommand({
      name: "dotnet",
      image: "app:1",
      accountId: "customer1",
      envFile: "/app/.env",
      containerPort: 8080,
      limits,
      cgroupParent: tenantIdentity("customer1", base).slice,
      dataPath: "/app/data",
    });
    for (const flag of [
      "--memory 2048m --memory-swap 2048m",
      "--cpus 1.5",
      "--cgroup-parent",
      "--read-only --user 65532:65532",
      "dst=/data",
      "--cap-drop ALL",
    ])
      expect(cmd).toContain(flag);
  });
  it("runs .NET as the tenant UID so changing a project ID cannot evade its user quota", () => {
    const cmd = buildManagedContainerRunCommand({
      name: "dotnet",
      image: "app:1",
      accountId: "customer1",
      envFile: "/app/.env",
      containerPort: 8080,
      limits,
      linuxUser: "vxcustomer1",
    });
    expect(cmd).toContain("$(id -u 'vxcustomer1')");
    expect(cmd).toContain("$(id -g 'vxcustomer1')");
  });
});
