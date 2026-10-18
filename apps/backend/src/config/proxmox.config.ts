import { registerAs } from "@nestjs/config";

export const proxmoxConfig = registerAs("proxmox", () => ({
  provider: process.env.PROXMOX_PROVIDER ?? "mock",
  apiUrl: process.env.PROXMOX_API_URL ?? "",
  tokenId: process.env.PROXMOX_TOKEN_ID ?? "",
  tokenSecret: process.env.PROXMOX_TOKEN_SECRET ?? "",
  defaultNode: process.env.PROXMOX_DEFAULT_NODE ?? "pve-fra-01",
  defaultTemplateVmId: process.env.PROXMOX_DEFAULT_TEMPLATE_VMID ?? "",
  storage: process.env.PROXMOX_STORAGE ?? "local-lvm",
  disk: process.env.PROXMOX_DISK ?? "scsi0",
  taskTimeoutMs: Number(process.env.PROXMOX_TASK_TIMEOUT_MS ?? 600_000),
  regionNodes: parseMap(process.env.PROXMOX_REGION_NODES),
  templates: parseMap(process.env.PROXMOX_TEMPLATES),
}));

function parseMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export type ProxmoxConfig = ReturnType<typeof proxmoxConfig>;
