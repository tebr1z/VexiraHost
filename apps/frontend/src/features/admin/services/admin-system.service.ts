import { parseLocalizedText, type LocalizedText } from "@/lib/localized-text";
import { parseSiteAccess, type SiteAccessConfig } from "@/lib/site-access";
import { apiClient } from "@/services/api-client";

export type KapitalEnvironment = "test" | "production";

export interface KapitalPreset {
  label: string;
  username: string;
  baseUrl: string;
}

export interface AdminKapitalSettings {
  environment: KapitalEnvironment;
  username: string;
  password: string;
  passwordConfigured: boolean;
  baseUrl: string;
  configured: boolean;
  source: "database" | "env" | "preset";
}

export interface AdminMaintenanceSettings {
  enabled: boolean;
  message: LocalizedText;
}

export interface AdminAnnouncementSettings {
  enabled: boolean;
  title: LocalizedText;
  message: LocalizedText;
}

export interface AdminGoogleOAuthSettings {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  configured: boolean;
  source: "database" | "env";
}

export interface AdminGitHubOAuthSettings {
  clientId: string;
  callbackUrl: string;
  deployCallbackUrl: string;
  secretConfigured: boolean;
  configured: boolean;
  source: "database" | "env";
}

export interface AdminTurnstileSettings {
  enabled: boolean;
  siteKey: string;
  secretConfigured: boolean;
  hostnames: string;
  source: "database" | "default";
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
  epoint: {
    configured: boolean;
    ready: boolean;
    baseUrl: string;
    resultUrl: string;
    issues: string[];
  };
  googleOAuth: AdminGoogleOAuthSettings;
  githubOAuth: AdminGitHubOAuthSettings;
  turnstile: AdminTurnstileSettings;
  cloudflareDns: {
    configured: boolean;
    canCreateZones: boolean;
  };
  authoritativeDns: {
    configured: boolean;
    nameservers: string[];
  };
  access: SiteAccessConfig;
  maintenance: AdminMaintenanceSettings;
  announcement: AdminAnnouncementSettings;
  ticketAutoCloseHours: number;
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
  maintenanceMessage?: LocalizedText;
  announcementEnabled?: boolean;
  announcementTitle?: LocalizedText;
  announcementMessage?: LocalizedText;
  loginEnabled?: boolean;
  registerEnabled?: boolean;
  loginMessage?: LocalizedText;
  registerMessage?: LocalizedText;
  sectionBlocks?: SiteAccessConfig["sections"];
  googleClientId?: string;
  googleClientSecret?: string;
  googleCallbackUrl?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  githubDeployCallbackUrl?: string;
  turnstileEnabled?: boolean;
  turnstileSiteKey?: string;
  turnstileSecret?: string;
  turnstileHostnames?: string;
  ticketAutoCloseHours?: number;
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  const res = await apiClient.request<AdminSystemStatus>("/admin/system");
  return normalizeAdminSystemStatus(res.data as AdminSystemStatus);
}

export async function updateAdminSystemSettings(
  input: UpdateSystemSettingsInput,
): Promise<AdminSystemStatus> {
  const res = await apiClient.request<AdminSystemStatus>("/admin/system", {
    method: "PATCH",
    body: input,
  });
  return normalizeAdminSystemStatus(res.data as AdminSystemStatus);
}

function normalizeAdminSystemStatus(data: AdminSystemStatus): AdminSystemStatus {
  const hours = Number(data.ticketAutoCloseHours);
  return {
    ...data,
    epoint: data.epoint ?? {
      configured: false,
      ready: false,
      baseUrl: "",
      resultUrl: "",
      issues: ["Epoint status unavailable"],
    },
    cloudflareDns: data.cloudflareDns ?? { configured: false, canCreateZones: false },
    githubOAuth: data.githubOAuth ?? {
      clientId: "",
      callbackUrl: "",
      deployCallbackUrl: "",
      secretConfigured: false,
      configured: false,
      source: "env",
    },
    ticketAutoCloseHours: Number.isFinite(hours) && hours >= 1 ? Math.min(hours, 720) : 12,
    maintenance: {
      enabled: Boolean(data.maintenance?.enabled),
      message: parseLocalizedText(data.maintenance?.message),
    },
    announcement: {
      enabled: Boolean(data.announcement?.enabled),
      title: parseLocalizedText(data.announcement?.title),
      message: parseLocalizedText(data.announcement?.message),
    },
    access: parseSiteAccess(data.access),
  };
}
