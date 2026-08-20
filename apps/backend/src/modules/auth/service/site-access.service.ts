import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import {
  emptyLocalizedText,
  parseLocalizedText,
  stringifyLocalizedText,
  type LocalizedText,
} from "@/shared/i18n/localized-text";

export const SITE_SECTIONS = [
  "hosting",
  "vps",
  "domains",
  "licenses",
  "licensesWindows",
  "licensesServer",
  "licensesOffice",
  "licensesAntivirus",
  "email",
  "webmail",
  "whatsapp",
  "cart",
  "blog",
  "forum",
  "design",
  "about",
  "faq",
  "contact",
  "support",
] as const;

export type SiteSection = (typeof SITE_SECTIONS)[number];

export interface SectionAccess {
  blocked: boolean;
  message: LocalizedText;
}

export interface SiteAccessConfig {
  loginEnabled: boolean;
  registerEnabled: boolean;
  loginMessage: LocalizedText;
  registerMessage: LocalizedText;
  sections: Record<SiteSection, SectionAccess>;
}

const KEYS = {
  loginEnabled: "access_login_enabled",
  registerEnabled: "access_register_enabled",
  loginMessage: "access_login_message",
  registerMessage: "access_register_message",
  sections: "access_sections",
} as const;

function defaultSections(): Record<SiteSection, SectionAccess> {
  return Object.fromEntries(
    SITE_SECTIONS.map((key) => [key, { blocked: false, message: emptyLocalizedText() }]),
  ) as Record<SiteSection, SectionAccess>;
}

function isSiteSection(value: string): value is SiteSection {
  return (SITE_SECTIONS as readonly string[]).includes(value);
}

function isPrivilegedRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "STAFF";
}

function categoryToSection(category: string): SiteSection | null {
  switch (category) {
    case ProductCategory.HOSTING:
    case ProductCategory.BACKUP:
      return "hosting";
    case ProductCategory.VPS:
    case ProductCategory.DEDICATED:
      return "vps";
    case ProductCategory.DOMAIN:
      return "domains";
    case ProductCategory.LICENSE:
    case ProductCategory.SSL:
      return "licenses";
    case ProductCategory.WHATSAPP_API:
      return "whatsapp";
    case ProductCategory.EMAIL:
      return "email";
    default:
      return null;
  }
}

@Injectable()
export class SiteAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<SiteAccessConfig> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const sections = defaultSections();
    const storedSections = parseSections(map[KEYS.sections]);
    for (const key of SITE_SECTIONS) {
      if (storedSections[key]) {
        sections[key] = storedSections[key];
      }
    }

    return {
      loginEnabled: map[KEYS.loginEnabled] !== "false",
      registerEnabled: map[KEYS.registerEnabled] !== "false",
      loginMessage: parseLocalizedText(map[KEYS.loginMessage]),
      registerMessage: parseLocalizedText(map[KEYS.registerMessage]),
      sections,
    };
  }

  async save(input: {
    loginEnabled?: boolean;
    registerEnabled?: boolean;
    loginMessage?: LocalizedText;
    registerMessage?: LocalizedText;
    sections?: Partial<Record<SiteSection, Partial<SectionAccess>>>;
  }): Promise<SiteAccessConfig> {
    const current = await this.getConfig();

    if (input.loginEnabled !== undefined) {
      await this.upsert(KEYS.loginEnabled, input.loginEnabled ? "true" : "false");
    }
    if (input.registerEnabled !== undefined) {
      await this.upsert(KEYS.registerEnabled, input.registerEnabled ? "true" : "false");
    }
    if (input.loginMessage) {
      await this.upsert(KEYS.loginMessage, stringifyLocalizedText(input.loginMessage));
    }
    if (input.registerMessage) {
      await this.upsert(KEYS.registerMessage, stringifyLocalizedText(input.registerMessage));
    }
    if (input.sections) {
      const next = current.sections;
      for (const key of SITE_SECTIONS) {
        const patch = input.sections[key];
        if (!patch) continue;
        if (patch.blocked !== undefined) next[key].blocked = Boolean(patch.blocked);
        if (patch.message) next[key].message = parseLocalizedText(patch.message);
      }
      await this.upsert(KEYS.sections, JSON.stringify(next));
    }

    return this.getConfig();
  }

  async assertRegisterOpen(): Promise<void> {
    const config = await this.getConfig();
    if (!config.registerEnabled) {
      throw new ServiceUnavailableException("Registration is temporarily closed");
    }
  }

  async assertLoginOpen(role?: string | null): Promise<void> {
    const config = await this.getConfig();
    if (config.loginEnabled || isPrivilegedRole(role)) return;
    throw new ServiceUnavailableException("Login is temporarily closed");
  }

  async assertSectionOpen(section: SiteSection): Promise<void> {
    const config = await this.getConfig();
    if (config.sections[section]?.blocked) {
      throw new ServiceUnavailableException("This section is temporarily closed");
    }
  }

  async assertCheckoutOpen(categories: string[]): Promise<void> {
    const config = await this.getConfig();
    if (config.sections.cart.blocked) {
      throw new ServiceUnavailableException("This section is temporarily closed");
    }
    for (const category of categories) {
      const section = categoryToSection(category);
      if (section && config.sections[section]?.blocked) {
        throw new ServiceUnavailableException("This section is temporarily closed");
      }
    }
  }

  private upsert(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

function parseSections(raw?: string): Partial<Record<SiteSection, SectionAccess>> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Record<SiteSection, SectionAccess>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isSiteSection(key) || !value || typeof value !== "object") continue;
      const row = value as { blocked?: unknown; message?: unknown };
      result[key] = {
        blocked: row.blocked === true,
        message: parseLocalizedText(row.message),
      };
    }
    return result;
  } catch {
    return {};
  }
}
