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

import { mapProductPrices } from "@/shared/pricing/product-price.util";
import { resolveUniqueSlug, slugify } from "@/utils/slug.util";

function resolvePlanServerIds(serverIds?: string[], serverId?: string): string[] {
  const ordered = (serverIds?.length ? serverIds : serverId ? [serverId] : [])
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ordered)];
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
  createdAt: Date;
  updatedAt: Date;
  _count?: { accounts: number };
}) {
  const servers =
    plan.planServers?.map((link) => ({
      id: link.server.id,
      name: link.server.name,
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
  price: Decimal;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
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
    price: Number(product.price),
    currency: product.currency,
    billingCycle: product.billingCycle,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
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
    prices: product.prices ? mapProductPrices(product.prices as never) : [],
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
  constructor(private readonly catalogRepository: AdminCatalogRepository) {}

  private async assertHostingServer(serverId: string, panel: HostingPanel) {
    const server = await this.catalogRepository.findHostingServerById(serverId);
    if (!server) throw new NotFoundException("Hosting server not found");
    if (!server.isActive) throw new BadRequestException("Selected hosting server is not active");
    if (server.panel !== panel) {
      throw new BadRequestException("Hosting server panel must match the plan panel");
    }
    return server;
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
      pleskPlanName: dto.pleskPlanName?.trim() || null,
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
      price: new Decimal(dto.isFree ? 0 : dto.price),
      currency: dto.currency ?? "USD",
      billingCycle: dto.isFree ? "ONE_TIME" : (dto.billingCycle ?? "MONTHLY"),
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
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
      await this.catalogRepository.replaceProductPrices(product.id, dto.prices);
      const primaryMonthly =
        dto.prices.find((p) => p.currency === "USD" && p.period === "MONTHLY") ??
        dto.prices.find((p) => p.period === "MONTHLY") ??
        dto.prices[0];
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
      ...(dto.price !== undefined
        ? { price: new Decimal(dto.isFree || current.isFree ? 0 : dto.price) }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.billingCycle !== undefined || dto.isFree !== undefined
        ? {
            billingCycle:
              (dto.isFree ?? current.isFree)
                ? "ONE_TIME"
                : (dto.billingCycle ?? current.billingCycle),
          }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
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

    if (dto.prices) {
      await this.catalogRepository.replaceProductPrices(product.id, dto.prices);
      const primaryMonthly =
        dto.prices.find((p) => p.currency === "USD" && p.period === "MONTHLY") ??
        dto.prices.find((p) => p.period === "MONTHLY") ??
        dto.prices[0];
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
