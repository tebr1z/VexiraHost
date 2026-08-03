import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
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

  async claimFreeProduct(userId: string, productId: string) {
    const product = await this.licensesRepository.findProductById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundException("Product not found");
    }
    if (product.category !== "LICENSE" || !product.isFree) {
      throw new BadRequestException("This product is not available as a free download");
    }

    const existing = await this.licensesRepository.findUserFreeClaim(userId, product.name);
    if (existing) {
      return mapAddonService(existing);
    }

    return this.provisionAddon({
      userId,
      type: "LICENSE",
      name: product.name,
      productSlug: product.slug,
      productId: product.id,
    });
  }

  async provisionFromOrder(input: {
    userId: string;
    userEmail: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    localeHistory?: string[] | null;
    productCategory: ProductCategory;
    productName: string;
    productSlug: string;
    orderId: string;
    orderItemId?: string;
    identifier?: string;
  }): Promise<void> {
    const type = mapCategoryToAddonType(input.productCategory);
    if (!type) return;

    const product = await this.licensesRepository.findProductBySlug(input.productSlug);

    // Manual license: create pending service; admin sends key later from the order page.
    if (type === "LICENSE" && product?.deliveryMode === "MANUAL") {
      await this.createPendingManualLicense({
        userId: input.userId,
        product,
        orderId: input.orderId,
        orderItemId: input.orderItemId,
      });
      return;
    }

    const service = await this.provisionAddon({
      userId: input.userId,
      type,
      name: input.productName,
      identifier: input.identifier,
      productSlug: input.productSlug,
      productId: product?.id,
      orderId: input.orderId,
      orderItemId: input.orderItemId,
    });

    await this.sendDeliveryEmail(input, service, type);
  }

  async createPendingManualLicense(input: {
    userId: string;
    product: {
      id: string;
      name: string;
      slug: string;
      downloadUrl: string | null;
      downloadFileName: string | null;
      promoText: string | null;
      activationGuideText: string | null;
      activationGuideImageUrl: string | null;
      activationGuideVideoUrl: string | null;
    };
    orderId: string;
    orderItemId?: string;
  }) {
    const existing = await this.licensesRepository.findByOrderItem(
      input.orderId,
      input.orderItemId,
    );
    if (existing) return mapAddonService(existing);

    const service = await this.licensesRepository.createAddon({
      userId: input.userId,
      type: "LICENSE",
      name: input.product.name,
      status: "PROVISIONING",
      metadata: {
        pendingManualDelivery: true,
        deliveryMode: "MANUAL",
        orderId: input.orderId,
        orderItemId: input.orderItemId ?? null,
        productId: input.product.id,
        productSlug: input.product.slug,
        downloadUrl: input.product.downloadUrl,
        downloadFileName: input.product.downloadFileName,
        promoText: input.product.promoText,
        activationGuideText: input.product.activationGuideText,
        activationGuideImageUrl: input.product.activationGuideImageUrl,
        activationGuideVideoUrl: input.product.activationGuideVideoUrl,
      },
    });
    return mapAddonService(service);
  }

  async ensurePendingManualLicense(input: {
    userId: string;
    productSlug: string;
    orderId: string;
    orderItemId: string;
  }) {
    const product = await this.licensesRepository.findProductBySlug(input.productSlug);
    if (!product || product.deliveryMode !== "MANUAL") {
      throw new BadRequestException("Product is not configured for manual license delivery");
    }
    return this.createPendingManualLicense({
      userId: input.userId,
      product,
      orderId: input.orderId,
      orderItemId: input.orderItemId,
    });
  }

  async deliverManualLicense(input: {
    orderId: string;
    orderItemId: string;
    licenseKey: string;
    downloadUrl?: string | null;
    userEmail: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    localeHistory?: string[] | null;
  }) {
    const key = input.licenseKey.trim();
    if (!key) throw new BadRequestException("Activation code is required");

    let service = await this.licensesRepository.findByOrderItem(input.orderId, input.orderItemId);
    if (!service) {
      throw new NotFoundException("Pending license for this order item was not found");
    }
    if (service.type !== "LICENSE") {
      throw new BadRequestException("Order item is not a license");
    }

    const prevMeta = (service.metadata ?? {}) as Record<string, unknown>;
    const downloadUrl =
      input.downloadUrl?.trim() ||
      (typeof prevMeta.downloadUrl === "string" ? prevMeta.downloadUrl : null) ||
      `${this.appUrl()}/dashboard/services`;

    service = await this.licensesRepository.updateAddon(service.id, {
      identifier: key,
      status: "ACTIVE",
      provisionedAt: new Date(),
      metadata: {
        ...prevMeta,
        licenseKey: key,
        downloadUrl,
        pendingManualDelivery: false,
        deliveredAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });

    const mapped = mapAddonService(service);
    await this.sendDeliveryEmail(
      {
        userEmail: input.userEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        preferredCurrency: input.preferredCurrency,
        localeHistory: input.localeHistory,
        productName: service.name,
        orderId: input.orderId,
      },
      mapped,
      "LICENSE",
    );

    return mapped;
  }

  listForOrder(orderId: string) {
    return this.licensesRepository.findByOrderId(orderId).then((rows) => rows.map(mapAddonService));
  }

  private async provisionAddon(input: {
    userId: string;
    type: AddonServiceType;
    name: string;
    identifier?: string;
    productSlug?: string;
    productId?: string;
    orderId?: string;
    orderItemId?: string;
  }) {
    let service = await this.licensesRepository.createAddon({
      userId: input.userId,
      type: input.type,
      name: input.name,
      identifier: input.identifier,
      status: "PROVISIONING",
      metadata:
        input.orderId || input.orderItemId
          ? {
              orderId: input.orderId ?? null,
              orderItemId: input.orderItemId ?? null,
            }
          : undefined,
    });

    try {
      const product =
        (input.productId ? await this.licensesRepository.findProductById(input.productId) : null) ??
        (input.productSlug
          ? await this.licensesRepository.findProductBySlug(input.productSlug)
          : null);

      const appUrl = this.configService.get<string>("APP_URL", "http://localhost:3000");
      const result = await this.addonProvider.provision(
        {
          type: input.type,
          name: input.name,
          identifier: input.identifier,
          productSlug: input.productSlug ?? product?.slug,
          productId: product?.id,
          delivery: product
            ? {
                deliveryMode: product.deliveryMode,
                isFree: product.isFree,
                licenseKeys: product.licenseKeys,
                downloadUrl: product.downloadUrl,
                downloadFileName: product.downloadFileName,
                promoText: product.promoText,
                activationGuideText: product.activationGuideText,
                activationGuideImageUrl: product.activationGuideImageUrl,
                activationGuideVideoUrl: product.activationGuideVideoUrl,
              }
            : null,
        },
        appUrl,
      );

      if (product && result.remainingLicenseKeys !== undefined) {
        await this.licensesRepository.updateProductLicenseKeys(
          product.id,
          result.remainingLicenseKeys,
        );
      }

      service = await this.licensesRepository.updateAddon(service.id, {
        identifier: result.identifier,
        status: result.status,
        metadata: {
          ...(typeof result.metadata === "object" && result.metadata ? result.metadata : {}),
          orderId: input.orderId ?? null,
          orderItemId: input.orderItemId ?? null,
        } as Prisma.InputJsonValue,
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
      localeHistory?: string[] | null;
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
          localeHistory: input.localeHistory,
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
          localeHistory: input.localeHistory,
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
