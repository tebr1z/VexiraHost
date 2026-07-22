import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AddonService, AddonServiceType, Prisma, ProductCategory } from "@prisma/client";

import type { ProvisionAddonDto } from "../dto";
import { MockAddonProvider } from "../providers/mock-addon.provider";
import { LicensesRepository } from "../repository/licenses.repository";
import { AddonEmailService } from "./addon-email.service";

function mapAddonService(service: AddonService) {
  return {
    id: service.id,
    type: service.type,
    name: service.name,
    identifier: service.identifier,
    status: service.status,
    metadata: service.metadata,
    expiresAt: service.expiresAt,
    provisionedAt: service.provisionedAt,
    createdAt: service.createdAt,
  };
}

function mapCategoryToAddonType(category: ProductCategory): AddonServiceType | null {
  switch (category) {
    case "LICENSE":
      return "LICENSE";
    case "SSL":
      return "SSL";
    case "EMAIL":
      return "EMAIL";
    case "BACKUP":
      return "BACKUP";
    default:
      return null;
  }
}

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private readonly licensesRepository: LicensesRepository,
    private readonly addonProvider: MockAddonProvider,
    private readonly addonEmailService: AddonEmailService,
    private readonly configService: ConfigService,
  ) {}

  listForUser(userId: string) {
    return this.licensesRepository
      .findByUserId(userId)
      .then((services) => services.map(mapAddonService));
  }

  async getForUser(id: string, userId: string) {
    const service = await this.licensesRepository.findByIdForUser(id, userId);
    if (!service) throw new NotFoundException("Addon service not found");
    return mapAddonService(service);
  }

  async provision(userId: string, dto: ProvisionAddonDto) {
    return this.provisionAddon({
      userId,
      type: dto.type,
      name: dto.name.trim(),
      identifier: dto.identifier?.trim(),
    });
  }

  async provisionFromOrder(input: {
    userId: string;
    userEmail: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    productCategory: ProductCategory;
    productName: string;
    productSlug: string;
    orderId: string;
    identifier?: string;
  }): Promise<void> {
    const type = mapCategoryToAddonType(input.productCategory);
    if (!type) return;

    const service = await this.provisionAddon({
      userId: input.userId,
      type,
      name: input.productName,
      identifier: input.identifier,
      productSlug: input.productSlug,
    });

    await this.sendDeliveryEmail(input, service, type);
  }

  private async provisionAddon(input: {
    userId: string;
    type: AddonServiceType;
    name: string;
    identifier?: string;
    productSlug?: string;
  }) {
    let service = await this.licensesRepository.createAddon({
      userId: input.userId,
      type: input.type,
      name: input.name,
      identifier: input.identifier,
      status: "PROVISIONING",
    });

    try {
      const appUrl = this.configService.get<string>("APP_URL", "http://localhost:3000");
      const result = await this.addonProvider.provision(
        {
          type: input.type,
          name: input.name,
          identifier: input.identifier,
          productSlug: input.productSlug,
        },
        appUrl,
      );

      service = await this.licensesRepository.updateAddon(service.id, {
        identifier: result.identifier,
        status: result.status,
        metadata: result.metadata as Prisma.InputJsonValue,
        expiresAt: result.expiresAt,
        provisionedAt: new Date(),
      });

      return mapAddonService(service);
    } catch (error) {
      await this.licensesRepository.updateAddon(service.id, { status: "CANCELLED" });
      throw error;
    }
  }

  private async sendDeliveryEmail(
    input: {
      userEmail: string;
      firstName?: string | null;
      lastName?: string | null;
      preferredCurrency?: string | null;
      productName: string;
      orderId: string;
    },
    service: ReturnType<typeof mapAddonService>,
    type: AddonServiceType,
  ): Promise<void> {
    const metadata = (service.metadata ?? {}) as Record<string, unknown>;

    try {
      if (type === "LICENSE") {
        const licenseKey = String(metadata.licenseKey ?? service.identifier ?? "");
        const downloadUrl = String(metadata.downloadUrl ?? `${this.appUrl()}/dashboard/services`);
        await this.addonEmailService.sendLicenseDeliveryEmail({
          to: input.userEmail,
          firstName: input.firstName,
          lastName: input.lastName,
          preferredCurrency: input.preferredCurrency,
          productName: input.productName,
          licenseKey,
          downloadUrl,
          orderId: input.orderId,
          expiresAt: service.expiresAt,
        });
        return;
      }

      if (type === "SSL") {
        await this.addonEmailService.sendSslDeliveryEmail({
          to: input.userEmail,
          firstName: input.firstName,
          lastName: input.lastName,
          preferredCurrency: input.preferredCurrency,
          productName: input.productName,
          domain: String(metadata.domain ?? service.identifier ?? "—"),
          certId: String(metadata.certId ?? service.identifier ?? "—"),
          orderId: input.orderId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Addon delivery email failed for order ${input.orderId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }
}
