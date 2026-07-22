import { registerAs } from "@nestjs/config";

export const proxmoxConfig = registerAs("proxmox", () => ({
  provider: process.env.PROXMOX_PROVIDER ?? "mock",
  apiUrl: process.env.PROXMOX_API_URL ?? "",
  tokenId: process.env.PROXMOX_TOKEN_ID ?? "",
  tokenSecret: process.env.PROXMOX_TOKEN_SECRET ?? "",
  defaultNode: process.env.PROXMOX_DEFAULT_NODE ?? "pve-fra-01",
}));

export type ProxmoxConfig = ReturnType<typeof proxmoxConfig>;
