import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HostingDistributionMode, HostingPanel, ProductCategory } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type {
  CreateHostingPlanDto,
  CreateProductDto,
  CreateServerPlanDto,
  UpdateHostingPlanDto,
  UpdateProductDto,
  UpdateServerPlanDto,
} from "../dto";
import { AdminCatalogRepository } from "../repository/admin-catalog.repository";

import { listPleskServicePlans } from "@/modules/hosting/clients/plesk-api.client";
import { isMockPanelServer } from "@/modules/hosting/utils/panel-endpoint.util";
import { CbarExchangeService } from "@/shared/pricing/cbar-exchange.service";
import { mapProductPrices, oneTimeProductPrices } from "@/shared/pricing/product-price.util";
import { expandProductPricesFromUsdSource } from "@/shared/pricing/usd-price-expand.util";
import { resolveUniqueSlug, slugify } from "@/utils/slug.util";

function resolvePlanServerIds(serverIds?: string[], serverId?: string): string[] {
  const ordered = (serverIds?.length ? serverIds : serverId ? [serverId] : [])
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ordered)];
}

function assertAutoDeployPlan(panel: HostingPanel, autoDeployEnabled?: boolean) {
  if (autoDeployEnabled && panel !== HostingPanel.PLESK) {
    throw new BadRequestException("Auto-deploy can only be enabled on Plesk hosting plans");
  }
}

function assertCampaignWindow(startsAt?: string | Date | null, endsAt?: string | Date | null) {
  if (!startsAt || !endsAt) return;
  if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw new BadRequestException("Campaign end date must be after its start date");
  }
}

function mapHostingPlan(plan: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  panel: string;
  serverId: string | null;
  distributionMode?: string;
  server?: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string;
    panel: string;
    isActive: boolean;
    maxAccounts?: number | null;
    accountCount?: number;
  } | null;
  planServers?: Array<{
    priority: number;
    isActive: boolean;
    server: {
      id: string;
      name: string;
      hostname: string;
      ipAddress: string;
      panel: string;
      isActive: boolean;
      maxAccounts: number | null;
      accountCount: number;
    };
  }>;
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
  price: Decimal;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
  pleskPlanName?: string | null;
  autoDeployEnabled?: boolean;
  autoDeployDiskGb?: number;
  autoDeployCpuPercent?: number;
  autoDeployMemoryMb?: number;
  autoDeployMaxApps?: number;
  autoDeployAiEnabled?: boolean;
  autoDeployAiMonthlyCredits?: number;
  autoDeploySecurityScanEnabled?: boolean;
  autoDeployServerId?: string | null;
  autoDeployServer?: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string;
    isActive: boolean;
    deployNodeEnabled: boolean;
    deployHealth: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { accounts: number };
}) {
  const servers =
    plan.planServers?.map((link) => ({
      id: link.server.id,
      name: link.server.name,
      hostname: link.server.hostname,
      ipAddress: link.server.ipAddress,
      panel: link.server.panel,
      isActive: link.server.isActive,
      maxAccounts: link.server.maxAccounts,
      accountCount: link.server.accountCount,
      priority: link.priority,
      salesFull:
        link.server.maxAccounts != null && link.server.accountCount >= link.server.maxAccounts,
    })) ??
    (plan.server
      ? [
          {
            id: plan.server.id,
            name: plan.server.name,
            hostname: plan.server.hostname,
            ipAddress: plan.server.ipAddress,
            panel: plan.server.panel,
            isActive: plan.server.isActive,
            maxAccounts: plan.server.maxAccounts ?? null,
            accountCount: plan.server.accountCount ?? 0,
            priority: 0,
            salesFull:
              plan.server.maxAccounts != null &&
              (plan.server.accountCount ?? 0) >= plan.server.maxAccounts,
          },
        ]
      : []);

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    panel: plan.panel,
    serverId: plan.serverId,
    distributionMode: plan.distributionMode ?? HostingDistributionMode.FAILOVER,
    server: plan.server
      ? {
          id: plan.server.id,
          name: plan.server.name,
          hostname: plan.server.hostname,
          ipAddress: plan.server.ipAddress,
          panel: plan.server.panel,
          isActive: plan.server.isActive,
        }
      : null,
    servers,
    diskGb: plan.diskGb,
    bandwidthGb: plan.bandwidthGb,
    maxDomains: plan.maxDomains,
    maxEmails: plan.maxEmails,
    maxDatabases: plan.maxDatabases,
    price: Number(plan.price),
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    pleskPlanName: plan.pleskPlanName ?? null,
    autoDeployEnabled: plan.autoDeployEnabled ?? false,
    autoDeployDiskGb: plan.autoDeployDiskGb ?? 1,
    autoDeployCpuPercent: plan.autoDeployCpuPercent ?? 100,
    autoDeployMemoryMb: plan.autoDeployMemoryMb ?? 1024,
    autoDeployMaxApps: plan.autoDeployMaxApps ?? 1,
    autoDeployAiEnabled: plan.autoDeployAiEnabled ?? false,
    autoDeployAiMonthlyCredits: plan.autoDeployAiMonthlyCredits ?? 0,
    autoDeploySecurityScanEnabled: plan.autoDeploySecurityScanEnabled ?? true,
    autoDeployServerId: plan.autoDeployServerId ?? null,
    autoDeployServer: plan.autoDeployServer ?? null,
    accountCount: plan._count?.accounts ?? 0,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function mapServerPlan(plan: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  bandwidthGbps: Decimal;
  regions: string[];
  price: Decimal;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { servers: number };
}) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    type: plan.type,
    cpuCores: plan.cpuCores,
    ramGb: plan.ramGb,
    diskGb: plan.diskGb,
    bandwidthGbps: Number(plan.bandwidthGbps),
    regions: plan.regions,
    price: Number(plan.price),
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    serverCount: plan._count?.servers ?? 0,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function mapProduct(product: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  catalogCategoryId?: string | null;
  hostingPlanSlug: string | null;
  costPrice?: Decimal;
  price: Decimal;
  currency: string;
  billingCycle: string;
  minimumQuantity?: number;
  requiresQuote?: boolean;
  isActive: boolean;
  sortOrder: number;
  discount3Months?: number;
  discount6Months?: number;
  discount12Months?: number;
  campaignDiscountPercent?: number;
  campaignStartsAt?: Date | null;
  campaignEndsAt?: Date | null;
  deliveryMode?: string;
  isFree?: boolean;
  licenseKeys?: string | null;
  downloadUrl?: string | null;
  downloadFileName?: string | null;
  promoText?: string | null;
  activationGuideText?: string | null;
  activationGuideImageUrl?: string | null;
  activationGuideVideoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { orderItems: number };
  prices?: Array<{
    currency: string;
    period: string;
    originalPrice: Decimal;
    salePrice: Decimal;
  }>;
}) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    catalogCategoryId: product.catalogCategoryId ?? null,
    hostingPlanSlug: product.hostingPlanSlug,
    costPrice: Number(product.costPrice ?? 0),
    price: Number(product.price),
    currency: product.currency,
    billingCycle: product.category === "LICENSE" ? "ONE_TIME" : product.billingCycle,
    minimumQuantity: Math.max(1, product.minimumQuantity ?? 1),
    requiresQuote: product.requiresQuote ?? false,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    discount3Months: product.discount3Months ?? 0,
    discount6Months: product.discount6Months ?? 0,
    discount12Months: product.discount12Months ?? 0,
    campaignDiscountPercent: product.campaignDiscountPercent ?? 0,
    campaignStartsAt: product.campaignStartsAt ?? null,
    campaignEndsAt: product.campaignEndsAt ?? null,
    deliveryMode: product.deliveryMode ?? "NONE",
    isFree: product.isFree ?? false,
    licenseKeys: product.licenseKeys ?? null,
    downloadUrl: product.downloadUrl ?? null,
    downloadFileName: product.downloadFileName ?? null,
    promoText: product.promoText ?? null,
    activationGuideText: product.activationGuideText ?? null,
    activationGuideImageUrl: product.activationGuideImageUrl ?? null,
    activationGuideVideoUrl: product.activationGuideVideoUrl ?? null,
    orderItemCount: product._count?.orderItems ?? 0,
    prices: product.prices
      ? mapProductPrices(
          (product.category === "LICENSE"
            ? oneTimeProductPrices(product.prices)
            : product.prices) as never,
        )
      : [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function digitalFieldsFromDto(dto: {
  deliveryMode?: string;
  isFree?: boolean;
  licenseKeys?: string | null;
  downloadUrl?: string | null;
  downloadFileName?: string | null;
  promoText?: string | null;
  activationGuideText?: string | null;
  activationGuideImageUrl?: string | null;
  activationGuideVideoUrl?: string | null;
  category?: string;
}) {
  const isLicenseLike = dto.category === "LICENSE";
  return {
    deliveryMode: isLicenseLike ? (dto.deliveryMode ?? "NONE") : "NONE",
    isFree: isLicenseLike ? Boolean(dto.isFree) : false,
    licenseKeys: isLicenseLike ? dto.licenseKeys?.trim() || null : null,
    downloadUrl: isLicenseLike ? dto.downloadUrl?.trim() || null : null,
    downloadFileName: isLicenseLike ? dto.downloadFileName?.trim() || null : null,
    promoText: isLicenseLike ? dto.promoText?.trim() || null : null,
    activationGuideText: isLicenseLike ? dto.activationGuideText?.trim() || null : null,
    activationGuideImageUrl: isLicenseLike ? dto.activationGuideImageUrl?.trim() || null : null,
    activationGuideVideoUrl: isLicenseLike ? dto.activationGuideVideoUrl?.trim() || null : null,
  };
}

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly catalogRepository: AdminCatalogRepository,
    private readonly cbarExchange: CbarExchangeService,
  ) {}

  private async expandPricesFromUsd<
    T extends { prices?: CreateProductDto["prices"]; isFree?: boolean; category?: string },
  >(dto: T): Promise<T["prices"]> {
    const prices =
      dto.category === "LICENSE" && dto.prices ? oneTimeProductPrices(dto.prices) : dto.prices;
    if (dto.isFree || !prices?.length) return prices;
    const rates = await this.cbarExchange.getRates();
    const yearlyEnabled = prices.some((p) => p.period === "YEARLY");
    return expandProductPricesFromUsdSource(prices, rates, yearlyEnabled);
  }

  private async assertHostingServer(serverId: string, panel: HostingPanel) {
    const server = await this.catalogRepository.findHostingServerById(serverId);
    if (!server) throw new NotFoundException("Hosting server not found");
    if (!server.isActive) throw new BadRequestException("Selected hosting server is not active");
    if (server.panel !== panel) {
      throw new BadRequestException("Hosting server panel must match the plan panel");
    }
    return server;
  }

  private async assertAutoDeployServer(serverId: string) {
    const server = await this.catalogRepository.findHostingServerById(serverId);
    if (!server) throw new NotFoundException("Auto Deploy server not found");
    if (!server.isActive)
      throw new BadRequestException("Selected Auto Deploy server is not active");
    if (!server.deployNodeEnabled) {
      throw new BadRequestException(
        "Selected server is not enabled as an Auto Deploy node. Enable it in server settings first.",
      );
    }
    return server;
  }

  private async assertPleskPlanExists(serverIds: string[], planName: string) {
    await Promise.all(
      serverIds.map(async (serverId) => {
        const server = await this.catalogRepository.findHostingServerById(serverId);
        if (!server || isMockPanelServer(server)) return;
        const plans = await listPleskServicePlans({
          hostname: server.hostname,
          ipAddress: server.ipAddress,
          panel: "PLESK",
          whmUsername: server.whmUsername,
          whmPasswordEnc: server.whmPasswordEnc,
          apiTokenEnc: server.apiTokenEnc,
        });
        if (!plans.some((plan) => plan.name === planName)) {
          throw new BadRequestException(
            `Plesk package "${planName}" does not exist on server "${server.name}"`,
          );
        }
      }),
    );
  }

  listHostingPlans() {
    return this.catalogRepository.listHostingPlans().then((plans) => plans.map(mapHostingPlan));
  }

  getHostingPlan(id: string) {
    return this.catalogRepository.findHostingPlanById(id).then((plan) => {
      if (!plan) throw new NotFoundException("Hosting plan not found");
      return mapHostingPlan(plan);
    });
  }

  private slugTaken(slug: string) {
    return this.catalogRepository.findHostingPlanBySlug(slug).then((plan) => !!plan);
  }

  private productSlugTaken(slug: string) {
    return this.catalogRepository.findProductBySlug(slug).then((product) => !!product);
  }

  async createHostingPlan(dto: CreateHostingPlanDto) {
    const serverIds = resolvePlanServerIds(dto.serverIds, dto.serverId);
    if (serverIds.length === 0) {
      throw new BadRequestException("Select at least one hosting server");
    }
    for (const serverId of serverIds) {
      await this.assertHostingServer(serverId, dto.panel);
    }
    const pleskPlanName = dto.pleskPlanName?.trim() ?? "";
    if (dto.panel === HostingPanel.PLESK) {
      if (!pleskPlanName) throw new BadRequestException("Select a Plesk service plan");
      await this.assertPleskPlanExists(serverIds, pleskPlanName);
    }
    assertAutoDeployPlan(dto.panel, dto.autoDeployEnabled);
    if (dto.autoDeployEnabled) {
      if (!dto.autoDeployServerId) {
        throw new BadRequestException("Select an Auto Deploy server");
      }
      await this.assertAutoDeployServer(dto.autoDeployServerId);
    }

    const slug = dto.slug?.trim()
      ? await resolveUniqueSlug(slugify(dto.slug), (candidate) => this.slugTaken(candidate))
      : await resolveUniqueSlug(dto.name, (candidate) => this.slugTaken(candidate));

    const plan = await this.catalogRepository.createHostingPlan({
      slug,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      panel: dto.panel,
      server: { connect: { id: serverIds[0]! } },
      distributionMode: dto.distributionMode ?? HostingDistributionMode.FAILOVER,
      diskGb: dto.diskGb,
      bandwidthGb: dto.bandwidthGb,
      maxDomains: dto.maxDomains,
      maxEmails: dto.maxEmails,
      maxDatabases: dto.maxDatabases,
      price: new Decimal(dto.price),
      currency: dto.currency ?? "USD",
      billingCycle: dto.billingCycle ?? "MONTHLY",
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      pleskPlanName: pleskPlanName || null,
      autoDeployEnabled: dto.autoDeployEnabled ?? false,
      autoDeployDiskGb: dto.autoDeployDiskGb ?? 1,
      autoDeployCpuPercent: dto.autoDeployCpuPercent ?? 100,
      autoDeployMemoryMb: dto.autoDeployMemoryMb ?? 1024,
      autoDeployMaxApps: dto.autoDeployMaxApps ?? 1,
      autoDeployAiEnabled: dto.autoDeployAiEnabled ?? false,
      autoDeployAiMonthlyCredits: dto.autoDeployAiMonthlyCredits ?? 0,
      autoDeploySecurityScanEnabled: dto.autoDeploySecurityScanEnabled ?? true,
      ...(dto.autoDeployServerId
        ? { autoDeployServer: { connect: { id: dto.autoDeployServerId } } }
        : {}),
    });
    await this.catalogRepository.replacePlanServers(plan.id, serverIds);
    const created = await this.catalogRepository.findHostingPlanById(plan.id);
    return mapHostingPlan(created!);
  }

  async updateHostingPlan(id: string, dto: UpdateHostingPlanDto) {
    const current = await this.catalogRepository.findHostingPlanById(id);
    if (!current) throw new NotFoundException("Hosting plan not found");

    const nextPanel = dto.panel ?? current.panel;
    const serverIds =
      dto.serverIds ??
      (dto.serverId
        ? [dto.serverId]
        : (current.planServers?.map((link) => link.serverId) ??
          (current.serverId ? [current.serverId] : [])));

    if (serverIds.length === 0) {
      throw new BadRequestException("Hosting plan must be linked to at least one server");
    }
    for (const serverId of serverIds) {
      await this.assertHostingServer(serverId, nextPanel);
    }
    const nextPleskPlanName =
      dto.pleskPlanName !== undefined
        ? dto.pleskPlanName?.trim() || ""
        : current.pleskPlanName?.trim() || "";
    if (nextPanel === HostingPanel.PLESK) {
      if (!nextPleskPlanName) throw new BadRequestException("Select a Plesk service plan");
      if (dto.pleskPlanName !== undefined || dto.serverIds || dto.serverId) {
        await this.assertPleskPlanExists(serverIds, nextPleskPlanName);
      }
    }

    const nextAutoDeploy =
      dto.autoDeployEnabled !== undefined ? dto.autoDeployEnabled : current.autoDeployEnabled;
    assertAutoDeployPlan(nextPanel, nextAutoDeploy);
    const nextAutoDeployServerId =
      dto.autoDeployServerId !== undefined ? dto.autoDeployServerId : current.autoDeployServerId;
    if (nextAutoDeploy) {
      if (!nextAutoDeployServerId) {
        throw new BadRequestException("Select an Auto Deploy server");
      }
      await this.assertAutoDeployServer(nextAutoDeployServerId);
    }

    await this.catalogRepository.updateHostingPlan(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.panel !== undefined ? { panel: dto.panel } : {}),
      server: { connect: { id: serverIds[0]! } },
      ...(dto.distributionMode !== undefined ? { distributionMode: dto.distributionMode } : {}),
      ...(dto.diskGb !== undefined ? { diskGb: dto.diskGb } : {}),
      ...(dto.bandwidthGb !== undefined ? { bandwidthGb: dto.bandwidthGb } : {}),
      ...(dto.maxDomains !== undefined ? { maxDomains: dto.maxDomains } : {}),
      ...(dto.maxEmails !== undefined ? { maxEmails: dto.maxEmails } : {}),
      ...(dto.maxDatabases !== undefined ? { maxDatabases: dto.maxDatabases } : {}),
      ...(dto.price !== undefined ? { price: new Decimal(dto.price) } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.billingCycle !== undefined ? { billingCycle: dto.billingCycle } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.pleskPlanName !== undefined
        ? { pleskPlanName: dto.pleskPlanName?.trim() || null }
        : {}),
      ...(dto.autoDeployEnabled !== undefined ? { autoDeployEnabled: dto.autoDeployEnabled } : {}),
      ...(dto.autoDeployDiskGb !== undefined ? { autoDeployDiskGb: dto.autoDeployDiskGb } : {}),
      ...(dto.autoDeployCpuPercent !== undefined
        ? { autoDeployCpuPercent: dto.autoDeployCpuPercent }
        : {}),
      ...(dto.autoDeployMemoryMb !== undefined
        ? { autoDeployMemoryMb: dto.autoDeployMemoryMb }
        : {}),
      ...(dto.autoDeployMaxApps !== undefined ? { autoDeployMaxApps: dto.autoDeployMaxApps } : {}),
      ...(dto.autoDeployAiEnabled !== undefined
        ? { autoDeployAiEnabled: dto.autoDeployAiEnabled }
        : {}),
      ...(dto.autoDeployAiMonthlyCredits !== undefined
        ? { autoDeployAiMonthlyCredits: dto.autoDeployAiMonthlyCredits }
        : {}),
      ...(dto.autoDeploySecurityScanEnabled !== undefined
        ? { autoDeploySecurityScanEnabled: dto.autoDeploySecurityScanEnabled }
        : {}),
      ...(dto.autoDeployServerId !== undefined
        ? dto.autoDeployServerId
          ? { autoDeployServer: { connect: { id: dto.autoDeployServerId } } }
          : { autoDeployServer: { disconnect: true } }
        : {}),
    });
    if (dto.serverIds || dto.serverId) {
      await this.catalogRepository.replacePlanServers(id, serverIds);
    }
    const updated = await this.catalogRepository.findHostingPlanById(id);
    return mapHostingPlan(updated!);
  }

  async deleteHostingPlan(id: string) {
    const plan = await this.catalogRepository.findHostingPlanById(id);
    if (!plan) throw new NotFoundException("Hosting plan not found");
    if (plan._count.accounts > 0) {
      throw new BadRequestException("Cannot delete plan with active hosting accounts");
    }
    await this.catalogRepository.deleteHostingPlan(id);
    return { success: true };
  }

  listServerPlans() {
    return this.catalogRepository.listServerPlans().then((plans) => plans.map(mapServerPlan));
  }

  getServerPlan(id: string) {
    return this.catalogRepository.findServerPlanById(id).then((plan) => {
      if (!plan) throw new NotFoundException("Server plan not found");
      return mapServerPlan(plan);
    });
  }

  async createServerPlan(dto: CreateServerPlanDto) {
    const existing = await this.catalogRepository.findServerPlanBySlug(dto.slug);
    if (existing) throw new ConflictException("Plan slug already exists");

    const plan = await this.catalogRepository.createServerPlan({
      slug: dto.slug.trim().toLowerCase(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      cpuCores: dto.cpuCores,
      ramGb: dto.ramGb,
      diskGb: dto.diskGb,
      bandwidthGbps: new Decimal(dto.bandwidthGbps ?? 1),
      regions: dto.regions ?? ["fra-01", "nyc-01", "sin-01"],
      price: new Decimal(dto.price),
      currency: dto.currency ?? "USD",
      billingCycle: dto.billingCycle ?? "MONTHLY",
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return mapServerPlan({ ...plan, _count: { servers: 0 } });
  }

  async updateServerPlan(id: string, dto: UpdateServerPlanDto) {
    await this.getServerPlan(id);
    const plan = await this.catalogRepository.updateServerPlan(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.cpuCores !== undefined ? { cpuCores: dto.cpuCores } : {}),
      ...(dto.ramGb !== undefined ? { ramGb: dto.ramGb } : {}),
      ...(dto.diskGb !== undefined ? { diskGb: dto.diskGb } : {}),
      ...(dto.bandwidthGbps !== undefined ? { bandwidthGbps: new Decimal(dto.bandwidthGbps) } : {}),
      ...(dto.regions !== undefined ? { regions: dto.regions } : {}),
      ...(dto.price !== undefined ? { price: new Decimal(dto.price) } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.billingCycle !== undefined ? { billingCycle: dto.billingCycle } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
    return mapServerPlan({ ...plan, _count: { servers: 0 } });
  }

  async deleteServerPlan(id: string) {
    const plan = await this.catalogRepository.findServerPlanById(id);
    if (!plan) throw new NotFoundException("Server plan not found");
    if (plan._count.servers > 0) {
      throw new BadRequestException("Cannot delete plan with deployed servers");
    }
    await this.catalogRepository.deleteServerPlan(id);
    return { success: true };
  }

  listProducts() {
    return this.catalogRepository.listProducts().then((products) => products.map(mapProduct));
  }

  getProduct(id: string) {
    return this.catalogRepository.findProductById(id).then((product) => {
      if (!product) throw new NotFoundException("Product not found");
      return mapProduct(product);
    });
  }

  private async validateHostingPlanSlug(slug: string | null | undefined) {
    if (!slug) return;
    const plan = await this.catalogRepository.findHostingPlanBySlug(slug);
    if (!plan) throw new BadRequestException(`Hosting plan "${slug}" not found`);
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.requiresQuote && dto.isFree) {
      throw new BadRequestException("A quote-only product cannot also be free");
    }
    assertCampaignWindow(dto.campaignStartsAt, dto.campaignEndsAt);
    const slug = dto.slug?.trim()
      ? await resolveUniqueSlug(slugify(dto.slug), (candidate) => this.productSlugTaken(candidate))
      : await resolveUniqueSlug(dto.name, (candidate) => this.productSlugTaken(candidate));

    if (dto.category === ProductCategory.HOSTING) {
      await this.validateHostingPlanSlug(dto.hostingPlanSlug);
      if (!dto.hostingPlanSlug) {
        throw new BadRequestException("Hosting products require hostingPlanSlug");
      }
    }

    const digital = digitalFieldsFromDto({ ...dto, category: dto.category });

    const product = await this.catalogRepository.createProduct({
      slug,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      category: dto.category,
      ...(dto.catalogCategoryId
        ? { catalogCategory: { connect: { id: dto.catalogCategoryId } } }
        : {}),
      hostingPlanSlug:
        dto.category === ProductCategory.HOSTING ? (dto.hostingPlanSlug?.trim() ?? null) : null,
      costPrice: new Decimal(dto.costPrice ?? 0),
      price: new Decimal(dto.isFree || dto.requiresQuote ? 0 : dto.price),
      currency: dto.currency ?? "USD",
      billingCycle:
        dto.category === "LICENSE" || dto.isFree ? "ONE_TIME" : (dto.billingCycle ?? "MONTHLY"),
      minimumQuantity: dto.minimumQuantity ?? 1,
      requiresQuote: dto.requiresQuote ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      discount3Months: dto.discount3Months ?? 0,
      discount6Months: dto.discount6Months ?? 0,
      discount12Months: dto.discount12Months ?? 0,
      campaignDiscountPercent: dto.campaignDiscountPercent ?? 0,
      campaignStartsAt: dto.campaignStartsAt ? new Date(dto.campaignStartsAt) : null,
      campaignEndsAt: dto.campaignEndsAt ? new Date(dto.campaignEndsAt) : null,
      deliveryMode: digital.deliveryMode as never,
      isFree: digital.isFree,
      licenseKeys: digital.licenseKeys,
      downloadUrl: digital.downloadUrl,
      downloadFileName: digital.downloadFileName,
      promoText: digital.promoText,
      activationGuideText: digital.activationGuideText,
      activationGuideImageUrl: digital.activationGuideImageUrl,
      activationGuideVideoUrl: digital.activationGuideVideoUrl,
    });

    if (dto.prices?.length) {
      const expandedPrices = await this.expandPricesFromUsd(dto);
      await this.catalogRepository.replaceProductPrices(product.id, expandedPrices ?? dto.prices);
      const primaryMonthly =
        (expandedPrices ?? dto.prices).find(
          (p) => p.currency === "USD" && p.period === "MONTHLY",
        ) ??
        (expandedPrices ?? dto.prices).find((p) => p.period === "MONTHLY") ??
        (expandedPrices ?? dto.prices)[0];
      if (primaryMonthly) {
        await this.catalogRepository.updateProduct(product.id, {
          price: new Decimal(primaryMonthly.salePrice),
          currency: primaryMonthly.currency,
        });
      }
    }

    const refreshed = await this.catalogRepository.findProductById(product.id);
    return mapProduct(refreshed!);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const current = await this.catalogRepository.findProductById(id);
    if (!current) throw new NotFoundException("Product not found");
    if ((dto.requiresQuote ?? current.requiresQuote) && (dto.isFree ?? current.isFree)) {
      throw new BadRequestException("A quote-only product cannot also be free");
    }
    assertCampaignWindow(
      dto.campaignStartsAt !== undefined ? dto.campaignStartsAt : current.campaignStartsAt,
      dto.campaignEndsAt !== undefined ? dto.campaignEndsAt : current.campaignEndsAt,
    );

    const category = dto.category ?? current.category;
    const hostingPlanSlug =
      dto.hostingPlanSlug !== undefined ? dto.hostingPlanSlug : current.hostingPlanSlug;

    if (category === ProductCategory.HOSTING) {
      await this.validateHostingPlanSlug(hostingPlanSlug);
      if (!hostingPlanSlug) {
        throw new BadRequestException("Hosting products require hostingPlanSlug");
      }
    }

    const nextCategory = category;
    const digitalPatch =
      dto.deliveryMode !== undefined ||
      dto.isFree !== undefined ||
      dto.licenseKeys !== undefined ||
      dto.downloadUrl !== undefined ||
      dto.downloadFileName !== undefined ||
      dto.promoText !== undefined ||
      dto.activationGuideText !== undefined ||
      dto.activationGuideImageUrl !== undefined ||
      dto.activationGuideVideoUrl !== undefined ||
      dto.category !== undefined
        ? digitalFieldsFromDto({
            category: nextCategory,
            deliveryMode: dto.deliveryMode ?? current.deliveryMode,
            isFree: dto.isFree ?? current.isFree,
            licenseKeys: dto.licenseKeys !== undefined ? dto.licenseKeys : current.licenseKeys,
            downloadUrl: dto.downloadUrl !== undefined ? dto.downloadUrl : current.downloadUrl,
            downloadFileName:
              dto.downloadFileName !== undefined ? dto.downloadFileName : current.downloadFileName,
            promoText: dto.promoText !== undefined ? dto.promoText : current.promoText,
            activationGuideText:
              dto.activationGuideText !== undefined
                ? dto.activationGuideText
                : current.activationGuideText,
            activationGuideImageUrl:
              dto.activationGuideImageUrl !== undefined
                ? dto.activationGuideImageUrl
                : current.activationGuideImageUrl,
            activationGuideVideoUrl:
              dto.activationGuideVideoUrl !== undefined
                ? dto.activationGuideVideoUrl
                : current.activationGuideVideoUrl,
          })
        : null;

    const product = await this.catalogRepository.updateProduct(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.catalogCategoryId !== undefined
        ? dto.catalogCategoryId
          ? { catalogCategory: { connect: { id: dto.catalogCategoryId } } }
          : { catalogCategory: { disconnect: true } }
        : {}),
      ...(dto.hostingPlanSlug !== undefined || dto.category !== undefined
        ? {
            hostingPlanSlug: category === ProductCategory.HOSTING ? hostingPlanSlug : null,
          }
        : {}),
      ...(dto.price !== undefined || dto.requiresQuote === true
        ? {
            price: new Decimal(
              (dto.isFree ?? current.isFree) || (dto.requiresQuote ?? current.requiresQuote)
                ? 0
                : (dto.price ?? Number(current.price)),
            ),
          }
        : {}),
      ...(dto.costPrice !== undefined ? { costPrice: new Decimal(dto.costPrice) } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.minimumQuantity !== undefined ? { minimumQuantity: dto.minimumQuantity } : {}),
      ...(dto.requiresQuote !== undefined ? { requiresQuote: dto.requiresQuote } : {}),
      ...(category === "LICENSE" || dto.billingCycle !== undefined || dto.isFree !== undefined
        ? {
            billingCycle:
              category === "LICENSE" || (dto.isFree ?? current.isFree)
                ? "ONE_TIME"
                : (dto.billingCycle ?? current.billingCycle),
          }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.discount3Months !== undefined ? { discount3Months: dto.discount3Months } : {}),
      ...(dto.discount6Months !== undefined ? { discount6Months: dto.discount6Months } : {}),
      ...(dto.discount12Months !== undefined ? { discount12Months: dto.discount12Months } : {}),
      ...(dto.campaignDiscountPercent !== undefined
        ? { campaignDiscountPercent: dto.campaignDiscountPercent }
        : {}),
      ...(dto.campaignStartsAt !== undefined
        ? { campaignStartsAt: dto.campaignStartsAt ? new Date(dto.campaignStartsAt) : null }
        : {}),
      ...(dto.campaignEndsAt !== undefined
        ? { campaignEndsAt: dto.campaignEndsAt ? new Date(dto.campaignEndsAt) : null }
        : {}),
      ...(digitalPatch
        ? {
            deliveryMode: digitalPatch.deliveryMode as never,
            isFree: digitalPatch.isFree,
            licenseKeys: digitalPatch.licenseKeys,
            downloadUrl: digitalPatch.downloadUrl,
            downloadFileName: digitalPatch.downloadFileName,
            promoText: digitalPatch.promoText,
            activationGuideText: digitalPatch.activationGuideText,
            activationGuideImageUrl: digitalPatch.activationGuideImageUrl,
            activationGuideVideoUrl: digitalPatch.activationGuideVideoUrl,
          }
        : {}),
    });

    const nextPrices =
      dto.prices ??
      (category === "LICENSE" && current.category !== "LICENSE"
        ? oneTimeProductPrices(current.prices ?? []).map((row) => ({
            ...row,
            originalPrice: Number(row.originalPrice),
            salePrice: Number(row.salePrice),
          }))
        : undefined);
    if (nextPrices) {
      const expandedPrices = await this.expandPricesFromUsd({
        prices: nextPrices,
        isFree: dto.isFree ?? current.isFree,
        category,
      });
      await this.catalogRepository.replaceProductPrices(product.id, expandedPrices ?? nextPrices);
      const primaryMonthly =
        (expandedPrices ?? nextPrices).find(
          (p) => p.currency === "USD" && p.period === "MONTHLY",
        ) ??
        (expandedPrices ?? nextPrices).find((p) => p.period === "MONTHLY") ??
        (expandedPrices ?? nextPrices)[0];
      if (primaryMonthly) {
        await this.catalogRepository.updateProduct(product.id, {
          price: new Decimal(primaryMonthly.salePrice),
          currency: primaryMonthly.currency,
        });
      }
    }

    const refreshed = await this.catalogRepository.findProductById(id);
    return mapProduct(refreshed!);
  }

  async deleteProduct(id: string) {
    const product = await this.catalogRepository.findProductById(id);
    if (!product) throw new NotFoundException("Product not found");
    if (product._count.orderItems > 0) {
      throw new BadRequestException("Cannot delete product referenced by orders");
    }
    await this.catalogRepository.deleteProduct(id);
    return { success: true };
  }
}
