import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { defaultProjectPricing, estimateProject, PROJECT_PACKAGE_KEYS } from "@vexira/types";
import type {
  ProjectPricingConfig,
  ProjectPricingDocument,
  ProjectQuoteRequest,
} from "@vexira/types";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { ProjectPricingConfigDto, SaveProjectPricingDto } from "./project-pricing.dto";

import { PrismaService } from "@/database/database.module";

export const PROJECT_PRICING_KEY = "project_pricing_v1";
const conflict = () =>
  new ConflictException(
    "Project pricing changed. Reload the latest prices before saving or requesting a proposal.",
  );
export function validateProjectPricing(value: unknown): ProjectPricingConfig {
  const dto = plainToInstance(ProjectPricingConfigDto, value);
  if (!dto || validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length) {
    throw new BadRequestException("Invalid project pricing configuration");
  }
  for (const key of PROJECT_PACKAGE_KEYS) {
    const pack = dto.packages[key];
    if (
      (pack.discount.type === "percent" && pack.discount.value > 100) ||
      (pack.discount.type === "amount" && pack.discount.value > pack.price) ||
      (pack.discount.type === "none" && pack.discount.value !== 0)
    ) {
      throw new BadRequestException(`Invalid discount for ${key}`);
    }
  }
  return dto;
}

@Injectable()
export class ProjectPricingService {
  constructor(private readonly prisma: PrismaService) {}
  async get(): Promise<ProjectPricingDocument> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: PROJECT_PRICING_KEY } });
    if (!row) return { config: defaultProjectPricing(), updatedAt: null };
    try {
      return {
        config: validateProjectPricing(JSON.parse(row.value)),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      // Do not advertise stale defaults when a saved price list cannot be read.
      throw new ServiceUnavailableException("Project pricing is temporarily unavailable");
    }
  }
  async save(input: SaveProjectPricingDto): Promise<ProjectPricingDocument> {
    const config = validateProjectPricing(input.config);
    const expected = input.expectedUpdatedAt ?? null;
    const value = JSON.stringify(config);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (expected === null) {
          const row = await tx.systemSetting.create({ data: { key: PROJECT_PRICING_KEY, value } });
          return { config, updatedAt: row.updatedAt.toISOString() };
        }
        const timestamp = new Date(expected);
        if (Number.isNaN(timestamp.getTime()))
          throw new BadRequestException("Invalid pricing revision");
        const updatedAt = new Date(Math.max(Date.now(), timestamp.getTime() + 1));
        const update = await tx.systemSetting.updateMany({
          where: { key: PROJECT_PRICING_KEY, updatedAt: timestamp },
          data: { value, updatedAt },
        });
        if (update.count !== 1) throw conflict();
        return { config, updatedAt: updatedAt.toISOString() };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002")
        throw conflict();
      throw error;
    }
  }
  async proposalSummary(selection: ProjectQuoteRequest): Promise<string> {
    const document = await this.get();
    if ((selection.pricingUpdatedAt ?? null) !== document.updatedAt) throw conflict();
    const config = document.config;
    const estimate = estimateProject(selection, config);
    const money = (value: number) => `${value.toFixed(2)} AZN`;
    return [
      "PROJECT PROPOSAL (server-calculated estimate)",
      `Package: ${selection.package}`,
      `Pages/screens: ${estimate.pages}; languages: ${estimate.languages}`,
      `Base: ${money(estimate.originalBase)}; discount: ${money(estimate.discountAmount)}; package price: ${money(estimate.base)}`,
      `Extra pages/screens: ${money(estimate.extraPages)}; extra languages: ${money(estimate.extraLanguages)}`,
      `Included features: ${config.packages[selection.package].included.join(", ") || "none"}`,
      ...estimate.features.map((key) => `${key}: ${money(config.features[key])}`),
      `TOTAL ESTIMATE: ${money(estimate.total)} (one-time development)`,
      `Gifts: standard non-premium .com/.net domain ${config.gifts.domainMonths} months; standard hosting + SSL ${config.gifts.hostingMonths} months; agreed-scope support ${estimate.supportMonths} months`,
      "Final scope and price require agreement; renewals, external subscriptions, translation and new features are separate.",
      `Pricing revision: ${document.updatedAt ?? "defaults-v1"}`,
    ].join("\n");
  }
}
