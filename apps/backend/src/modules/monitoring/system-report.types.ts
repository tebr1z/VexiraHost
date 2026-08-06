export type HealthState = "ok" | "warning" | "down" | "disabled";

export type OverallHealth = "healthy" | "degraded" | "critical";

export interface SystemHealthItem {
  key: string;
  label: string;
  state: HealthState;
  message: string;
}

export interface SystemHealthSnapshot {
  checkedAt: string;
  hostname: string;
  nodeEnv: string;
  overall: OverallHealth;
  items: SystemHealthItem[];
  queue?: {
    connected: boolean;
    waiting: number;
    active: number;
    failed: number;
  };
}
