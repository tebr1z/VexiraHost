import type { AddonServiceType, DigitalDeliveryMode, ServiceStatus } from "@prisma/client";

export interface ProductDeliveryConfig {
  deliveryMode: DigitalDeliveryMode;
  isFree: boolean;
  licenseKeys: string | null;
  downloadUrl: string | null;
  downloadFileName: string | null;
  promoText: string | null;
  activationGuideText: string | null;
  activationGuideImageUrl: string | null;
  activationGuideVideoUrl: string | null;
}

export interface AddonProvisionInput {
  type: AddonServiceType;
  name: string;
  identifier?: string;
  productSlug?: string;
  productId?: string;
  delivery?: ProductDeliveryConfig | null;
}

export interface AddonProvisionResult {
  identifier: string;
  status: ServiceStatus;
  metadata: Record<string, unknown>;
  expiresAt: Date | null;
  /** Remaining license key pool after consuming one key (LICENSE only). */
  remainingLicenseKeys?: string | null;
}

export interface AddonProvider {
  provision(input: AddonProvisionInput, appUrl?: string): Promise<AddonProvisionResult>;
}
