import type { AddonServiceType, ServiceStatus } from "@prisma/client";

export interface AddonProvisionInput {
  type: AddonServiceType;
  name: string;
  identifier?: string;
  productSlug?: string;
}

export interface AddonProvisionResult {
  identifier: string;
  status: ServiceStatus;
  metadata: Record<string, unknown>;
  expiresAt: Date | null;
}

export interface AddonProvider {
  provision(input: AddonProvisionInput, appUrl?: string): Promise<AddonProvisionResult>;
}
