import { apiClient } from "@/services/api-client";

export type KapitalEnvironment = "test" | "production";

export interface KapitalPreset {
  label: string;
  username: string;
  password: string;
  baseUrl: string;
}

export interface AdminKapitalSettings {
  environment: KapitalEnvironment;
  username: string;
  password: string;
  baseUrl: string;
  configured: boolean;
  source: "database" | "env" | "preset";
}

export interface AdminMaintenanceSettings {
  enabled: boolean;
  message: string;
}

export interface AdminSystemStatus {
  nodeEnv: string;
  queue: {
    connected: boolean;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  providers: {
    registrarProvider: string;
    paymentProvider: string;
    hostingProvider: string;
    proxmoxProvider: string;
  };
  envDefaults: {
    registrarProvider: string;
    paymentProvider: string;
    hostingProvider: string;
    proxmoxProvider: string;
  };
  kapital: AdminKapitalSettings;
  kapitalPresets: Record<KapitalEnvironment, KapitalPreset>;
  maintenance: AdminMaintenanceSettings;
  note: string;
}

export interface UpdateSystemSettingsInput {
  registrarProvider?: string;
  paymentProvider?: string;
  hostingProvider?: string;
  proxmoxProvider?: string;
  kapitalEnvironment?: KapitalEnvironment;
  kapitalUsername?: string;
  kapitalPassword?: string;
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  const res = await apiClient.request<AdminSystemStatus>("/admin/system");
  return res.data as AdminSystemStatus;
}

export async function updateAdminSystemSettings(
  input: UpdateSystemSettingsInput,
): Promise<AdminSystemStatus> {
  const res = await apiClient.request<AdminSystemStatus>("/admin/system", {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminSystemStatus;
}
