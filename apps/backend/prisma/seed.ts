import {
  BillingCycle,
  DigitalDeliveryMode,
  HostingPanel,
  PriceCurrency,
  PrismaClient,
  ProductCategory,
  ServerType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { FALLBACK_EXCHANGE_RATES } from "../src/shared/pricing/exchange-rates.types";
import { expandUsdPricesToAllCurrencies } from "../src/shared/pricing/usd-price-expand.util";
import { encryptSecret } from "../src/utils/crypto.util";

import { seedHostingCmsPage } from "./cms-hosting-seed";
import { seedMarketingCmsPages } from "./cms-marketing-pages-seed";

const prisma = new PrismaClient();

function multiCurrencyPrices(usdMonthly: number) {
  return expandUsdPricesToAllCurrencies(
    {
      monthlyOriginal: usdMonthly,
      monthlySale: usdMonthly,
      yearlyEnabled: true,
    },
    FALLBACK_EXCHANGE_RATES,
  );
}

function fixedAznPackagePrices(azn: number) {
  const usd = Number((azn / FALLBACK_EXCHANGE_RATES.usdToAzn).toFixed(4));
  const rows = expandUsdPricesToAllCurrencies(
    {
      monthlyOriginal: usd,
      monthlySale: usd,
      yearlyEnabled: false,
    },
    FALLBACK_EXCHANGE_RATES,
  );
  return rows.map((row) =>
    row.currency === PriceCurrency.AZN ? { ...row, originalPrice: azn, salePrice: azn } : row,
  );
}

const products = [
  {
    slug: "web-hosting-starter",
    name: "Web Hosting Starter",
    description: "Shared hosting for startups and portfolios.",
    category: ProductCategory.HOSTING,
    hostingPlanSlug: "web-starter",
    price: 12,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 1,
  },
  {
    slug: "vps-pro",
    name: "VPS Pro",
    description: "Dedicated VPS resources with root access.",
    category: ProductCategory.VPS,
    price: 49,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 2,
  },
  {
    slug: "dedicated-power",
    name: "Dedicated Power",
    description: "Bare-metal performance for demanding workloads.",
    category: ProductCategory.DEDICATED,
    price: 189,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 3,
  },
  {
    slug: "domain-com",
    name: ".COM Domain",
    description: "Register your .com domain for one year.",
    category: ProductCategory.DOMAIN,
    price: 9.99,
    billingCycle: BillingCycle.YEARLY,
    sortOrder: 4,
  },
  {
    slug: "windows-11-pro",
    name: "Windows 11 Pro",
    description:
      "Windows 11 Pro license for business workstations.\n• BitLocker & Remote Desktop\n• Instant key delivery",
    category: ProductCategory.LICENSE,
    price: 89,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 5,
  },
  {
    slug: "windows-11-home",
    name: "Windows 11 Home",
    description:
      "Windows 11 Home license for personal use.\n• Genuine activation key\n• Panel delivery after payment",
    category: ProductCategory.LICENSE,
    price: 69,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 6,
  },
  {
    slug: "windows-8",
    name: "Windows 8",
    description:
      "Windows 8 license for legacy systems.\n• Genuine activation key\n• Compatible with older hardware",
    category: ProductCategory.LICENSE,
    price: 49,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 7,
  },
  {
    slug: "windows-server-2022-standard",
    name: "Windows Server 2022 Standard",
    description:
      "Windows Server 2022 Standard license.\n• Physical & virtual server use\n• Panel delivery",
    category: ProductCategory.LICENSE,
    price: 129,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 8,
  },
  {
    slug: "windows-server-2022-datacenter",
    name: "Windows Server 2022 Datacenter",
    description:
      "Windows Server 2022 Datacenter license.\n• Unlimited virtualization\n• Enterprise workloads",
    category: ProductCategory.LICENSE,
    price: 249,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 9,
  },
  {
    slug: "windows-server-2019-standard",
    name: "Windows Server 2019 Standard",
    description:
      "Windows Server 2019 Standard license.\n• Stable long-term support\n• Genuine activation key",
    category: ProductCategory.LICENSE,
    price: 109,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 10,
  },
  {
    slug: "windows-server-2019-datacenter",
    name: "Windows Server 2019 Datacenter",
    description: "Windows Server 2019 Datacenter license.\n• Unlimited VMs\n• Panel delivery",
    category: ProductCategory.LICENSE,
    price: 219,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 11,
  },
  {
    slug: "windows-server-2016-standard",
    name: "Windows Server 2016 Standard",
    description:
      "Windows Server 2016 Standard license.\n• Legacy server support\n• Instant key delivery",
    category: ProductCategory.LICENSE,
    price: 99,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 12,
  },
  {
    slug: "windows-server-2016-datacenter",
    name: "Windows Server 2016 Datacenter",
    description:
      "Windows Server 2016 Datacenter license.\n• Unlimited virtualization rights\n• Genuine key",
    category: ProductCategory.LICENSE,
    price: 199,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 13,
  },
  {
    slug: "office-365-license",
    name: "Microsoft Office License",
    description:
      "Microsoft Office license for business desktops.\n• Instant key delivery\n• Compatible with Windows & Mac",
    category: ProductCategory.LICENSE,
    price: 39,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 14,
  },
  {
    slug: "antivirus-pro",
    name: "Antivirus Pro",
    description:
      "Business antivirus protection for workstations.\n• Real-time threat shield\n• Centralized license management",
    category: ProductCategory.LICENSE,
    price: 19,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 15,
  },
  {
    slug: "ssl-standard",
    name: "SSL Certificate",
    description: "Standard domain-validated SSL certificate.",
    category: ProductCategory.SSL,
    price: 29,
    billingCycle: BillingCycle.YEARLY,
    sortOrder: 16,
  },
  {
    slug: "email-pro",
    name: "Professional Webmail",
    description:
      "Business email with branded addresses and webmail.\n• Spam protection\n• Mobile & desktop sync",
    category: ProductCategory.EMAIL,
    price: 5,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 17,
  },
  {
    slug: "google-workspace",
    name: "Google Workspace",
    description:
      "Google Workspace for your domain — Gmail, Drive, Meet.\n• Professional @yourdomain.com\n• Admin console & collaboration tools",
    category: ProductCategory.EMAIL,
    price: 12,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 18,
  },
  {
    slug: "backup-daily",
    name: "Daily Backup",
    description: "Automated daily backups with 30-day retention.",
    category: ProductCategory.BACKUP,
    price: 9,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 19,
  },
  {
    slug: "whatsapp-api-5000",
    name: "WhatsApp API — 5.000 mesaj",
    description:
      "Aylıq 5.000 WhatsApp mesaj paketi.\n• REST API inteqrasiyası\n• Ödənişdən sonra admin təsdiqi tələb olunur\n• Küfür və təhqiramiz məzmun qadağandır",
    category: ProductCategory.WHATSAPP_API,
    price: 1.0,
    currency: "AZN",
    billingCycle: BillingCycle.ONE_TIME,
    deliveryMode: DigitalDeliveryMode.MANUAL,
    sortOrder: 25,
  },
  {
    slug: "whatsapp-api-15000",
    name: "WhatsApp API — 15.000 mesaj",
    description:
      "Aylıq 15.000 WhatsApp mesaj paketi.\n• REST API inteqrasiyası\n• Ödənişdən sonra admin təsdiqi tələb olunur\n• Küfür və təhqiramiz məzmun qadağandır",
    category: ProductCategory.WHATSAPP_API,
    price: 1.5,
    currency: "AZN",
    billingCycle: BillingCycle.ONE_TIME,
    deliveryMode: DigitalDeliveryMode.MANUAL,
    sortOrder: 26,
  },
];

const serverPlans = [
  {
    slug: "vps-starter",
    name: "VPS Starter",
    description: "Entry-level cloud compute for dev and staging.",
    type: ServerType.VPS,
    cpuCores: 2,
    ramGb: 4,
    diskGb: 80,
    bandwidthGbps: 1,
    price: 29,
    sortOrder: 1,
  },
  {
    slug: "vps-pro",
    name: "VPS Pro",
    description: "Balanced VPS for production apps and APIs.",
    type: ServerType.VPS,
    cpuCores: 4,
    ramGb: 8,
    diskGb: 160,
    bandwidthGbps: 2.5,
    price: 49,
    sortOrder: 2,
  },
  {
    slug: "vps-enterprise",
    name: "VPS Enterprise",
    description: "High-performance VPS with burst capacity.",
    type: ServerType.VPS,
    cpuCores: 8,
    ramGb: 16,
    diskGb: 320,
    bandwidthGbps: 5,
    price: 99,
    sortOrder: 3,
  },
  {
    slug: "dedicated-power",
    name: "Dedicated Power",
    description: "Bare-metal dedicated server for heavy workloads.",
    type: ServerType.DEDICATED,
    cpuCores: 16,
    ramGb: 64,
    diskGb: 2048,
    bandwidthGbps: 10,
    price: 189,
    sortOrder: 4,
  },
  {
    slug: "dedicated-metal",
    name: "Dedicated Metal",
    description: "Maximum performance dedicated infrastructure.",
    type: ServerType.DEDICATED,
    cpuCores: 32,
    ramGb: 128,
    diskGb: 4096,
    bandwidthGbps: 20,
    price: 349,
    sortOrder: 5,
  },
];

const hostingServers = [
  {
    slug: "cpanel-primary",
    name: "cPanel Primary",
    hostname: "cpanel.vexirahost.local",
    ipAddress: "10.0.0.10",
    panel: HostingPanel.CPANEL,
    whmUsername: "root",
    isDefault: true,
  },
  {
    slug: "plesk-primary",
    name: "Plesk Primary",
    hostname: "plesk.vexirahost.local",
    ipAddress: "10.0.0.11",
    panel: HostingPanel.PLESK,
    whmUsername: "admin",
    isDefault: true,
  },
];

const hostingPlans = [
  {
    slug: "web-starter",
    name: "Web Starter",
    description:
      "Shared cPanel hosting for personal sites and portfolios.\n• Free SSL & weekly backups\n• Webmail included",
    panel: HostingPanel.CPANEL,
    serverSlug: "cpanel-primary",
    diskGb: 10,
    bandwidthGb: 100,
    maxDomains: 1,
    maxEmails: 5,
    maxDatabases: 2,
    price: 12,
    sortOrder: 1,
  },
  {
    slug: "web-pro",
    name: "Web Pro",
    description:
      "cPanel hosting with room for multiple sites and email accounts.\n• Free SSL & weekly backups\n• Webmail + one-click WordPress",
    panel: HostingPanel.CPANEL,
    serverSlug: "cpanel-primary",
    diskGb: 50,
    bandwidthGb: 500,
    maxDomains: 10,
    maxEmails: 25,
    maxDatabases: 10,
    price: 29,
    sortOrder: 2,
  },
  {
    slug: "business-plesk",
    name: "Business Plesk",
    description:
      "Plesk-powered hosting for agencies and growing businesses.\n• Free SSL & weekly backups\n• Webmail + multi-site tools",
    panel: HostingPanel.PLESK,
    serverSlug: "plesk-primary",
    diskGb: 100,
    bandwidthGb: 1000,
    maxDomains: 25,
    maxEmails: 50,
    maxDatabases: 25,
    price: 49,
    sortOrder: 3,
  },
];

const tldPricing = [
  { tld: "com", registerPrice: 9.99, renewPrice: 9.99, transferPrice: 9.99, sortOrder: 1 },
  { tld: "net", registerPrice: 11.99, renewPrice: 11.99, transferPrice: 11.99, sortOrder: 2 },
  { tld: "org", registerPrice: 10.99, renewPrice: 10.99, transferPrice: 10.99, sortOrder: 3 },
  { tld: "io", registerPrice: 39.99, renewPrice: 39.99, transferPrice: 39.99, sortOrder: 4 },
  { tld: "ai", registerPrice: 69, renewPrice: 69, transferPrice: 69, sortOrder: 5 },
  { tld: "dev", registerPrice: 14.99, renewPrice: 14.99, transferPrice: 14.99, sortOrder: 6 },
  { tld: "app", registerPrice: 17.99, renewPrice: 17.99, transferPrice: 17.99, sortOrder: 7 },
];

async function main(): Promise<void> {
  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });

    for (const price of product.category === ProductCategory.WHATSAPP_API
      ? fixedAznPackagePrices(Number(product.price))
      : multiCurrencyPrices(Number(product.price))) {
      await prisma.productPrice.upsert({
        where: {
          productId_currency_period: {
            productId: saved.id,
            currency: price.currency,
            period: price.period,
          },
        },
        update: {
          originalPrice: price.originalPrice,
          salePrice: price.salePrice,
        },
        create: {
          productId: saved.id,
          ...price,
        },
      });
    }
  }

  for (const plan of serverPlans) {
    await prisma.serverPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  const serverIds: Record<string, string> = {};
  for (const server of hostingServers) {
    const saved = await prisma.hostingServer.upsert({
      where: { id: server.slug },
      update: {
        name: server.name,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        panel: server.panel,
        whmUsername: server.whmUsername,
        isDefault: server.isDefault,
        isActive: true,
      },
      create: {
        id: server.slug,
        name: server.name,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        panel: server.panel,
        whmUsername: server.whmUsername,
        whmPasswordEnc: encryptSecret("ChangeMe123!"),
        isDefault: server.isDefault,
        isActive: true,
      },
    });
    serverIds[server.slug] = saved.id;
  }

  for (const plan of hostingPlans) {
    const { serverSlug, ...planData } = plan;
    const serverId = serverIds[serverSlug];
    await prisma.hostingPlan.upsert({
      where: { slug: plan.slug },
      update: { ...planData, server: { connect: { id: serverId } } },
      create: { ...planData, server: { connect: { id: serverId } } },
    });
  }

  for (const tld of tldPricing) {
    await prisma.tldPricing.upsert({
      where: { tld: tld.tld },
      update: tld,
      create: tld,
    });
  }

  const adminPasswordHash = await bcrypt.hash("3865606Rt.", 12);
  await prisma.user.upsert({
    where: { email: "admin@vexirahost.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      firstName: "Admin",
      lastName: "Vexira",
    },
    create: {
      email: "admin@vexirahost.com",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      firstName: "Admin",
      lastName: "Vexira",
    },
  });

  const navGroups = [
    {
      key: "licenses",
      labels: { tr: "Lisanslar", en: "Licenses", az: "Lisenziyalar", ru: "Лицензии" },
      sortOrder: 1,
      items: [
        {
          labels: {
            tr: "Tüm Lisanslar",
            en: "All Licenses",
            az: "Bütün Lisenziyalar",
            ru: "Все лицензии",
          },
          href: "/licenses",
          pathMatch: "/licenses",
          sortOrder: 1,
        },
        {
          labels: {
            tr: "Windows Lisansları",
            en: "Windows Licenses",
            az: "Windows Lisenziyaları",
            ru: "Лицензии Windows",
          },
          href: "/licenses/windows",
          pathMatch: "/licenses/windows",
          sortOrder: 2,
        },
        {
          labels: {
            tr: "Server Lisansları",
            en: "Server Licenses",
            az: "Server Lisenziyaları",
            ru: "Серверные лицензии",
          },
          href: "/licenses/server",
          pathMatch: "/licenses/server",
          sortOrder: 3,
        },
        {
          labels: {
            tr: "Microsoft Office",
            en: "Microsoft Office",
            az: "Microsoft Office",
            ru: "Microsoft Office",
          },
          href: "/licenses/office",
          pathMatch: "/licenses/office",
          sortOrder: 4,
        },
        {
          labels: { tr: "Antivirüs", en: "Antivirus", az: "Antivirus", ru: "Антивирус" },
          href: "/licenses/antivirus",
          pathMatch: "/licenses/antivirus",
          sortOrder: 5,
        },
        {
          labels: {
            tr: "Google Workspace",
            en: "Google Workspace",
            az: "Google Workspace",
            ru: "Google Workspace",
          },
          href: "/email",
          pathMatch: "/email",
          sortOrder: 8,
        },
        {
          labels: { tr: "Webmail", en: "Webmail", az: "Webmail", ru: "Webmail" },
          href: "/webmail",
          pathMatch: "/webmail",
          sortOrder: 9,
        },
      ],
    },
    {
      key: "hostingServers",
      labels: {
        tr: "Hosting & Sunucu",
        en: "Hosting & Servers",
        az: "Hosting və Server",
        ru: "Хостинг и Серверы",
      },
      sortOrder: 2,
      items: [
        {
          labels: { tr: "Hosting", en: "Hosting", az: "Hosting", ru: "Хостинг" },
          href: "/hosting",
          pathMatch: "/hosting",
          sortOrder: 1,
        },
        {
          labels: { tr: "VDS / VPS", en: "VDS / VPS", az: "VDS / VPS", ru: "VDS / VPS" },
          href: "/vps",
          pathMatch: "/vps",
          sortOrder: 2,
        },
        {
          labels: { tr: "VPN", en: "VPN", az: "VPN", ru: "VPN" },
          href: "/hosting",
          pathMatch: "/hosting",
          sortOrder: 3,
        },
        {
          labels: { tr: "n8n Sunucu", en: "n8n Server", az: "n8n Server", ru: "n8n Сервер" },
          href: "/hosting",
          pathMatch: "/hosting",
          sortOrder: 4,
        },
        {
          labels: { tr: "Dosya Deploy", en: "File Deploy", az: "Fayl Deploy", ru: "Deploy файлов" },
          href: "/hosting",
          pathMatch: "/hosting",
          sortOrder: 5,
        },
      ],
    },
    {
      key: "whatsappApi",
      labels: { tr: "WhatsApp API", en: "WhatsApp API", az: "WhatsApp API", ru: "WhatsApp API" },
      sortOrder: 3,
      items: [
        {
          labels: {
            tr: "Mesaj Paketleri",
            en: "Message Packages",
            az: "Mesaj Paketləri",
            ru: "Пакеты сообщений",
          },
          href: "/products/whatsapp-api",
          pathMatch: "/products/whatsapp-api",
          sortOrder: 1,
        },
      ],
    },
    {
      key: "forumBlog",
      labels: { tr: "Forum/Blog", en: "Forum/Blog", az: "Forum/Blog", ru: "Форум/Блог" },
      sortOrder: 4,
      items: [
        {
          labels: { tr: "Forum", en: "Forum", az: "Forum", ru: "Форум" },
          href: "/forum",
          pathMatch: "/forum",
          sortOrder: 1,
        },
        {
          labels: { tr: "Blog", en: "Blog", az: "Blog", ru: "Блог" },
          href: "/blog",
          pathMatch: "/blog",
          sortOrder: 2,
        },
      ],
    },
  ];

  for (const group of navGroups) {
    const createdGroup = await prisma.navGroup.upsert({
      where: { key: group.key },
      update: {
        labels: group.labels,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      create: {
        key: group.key,
        labels: group.labels,
        sortOrder: group.sortOrder,
        isActive: true,
      },
    });

    for (const item of group.items) {
      const existingItem = await prisma.navItem.findFirst({
        where: {
          groupId: createdGroup.id,
          sortOrder: item.sortOrder,
        },
      });

      if (existingItem) {
        await prisma.navItem.update({
          where: { id: existingItem.id },
          data: {
            labels: item.labels,
            href: item.href,
            pathMatch: "pathMatch" in item ? item.pathMatch : null,
            isActive: true,
          },
        });
      } else {
        await prisma.navItem.create({
          data: {
            groupId: createdGroup.id,
            labels: item.labels,
            href: item.href,
            pathMatch: "pathMatch" in item ? item.pathMatch : null,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });
      }
    }

    const activeSortOrders = group.items.map((item) => item.sortOrder);
    await prisma.navItem.updateMany({
      where: {
        groupId: createdGroup.id,
        sortOrder: { notIn: activeSortOrders },
      },
      data: { isActive: false },
    });
  }

  // Keep catalogCategoryId aligned with system product category
  const categories = await prisma.catalogCategory.findMany();
  const categoryByType = new Map(categories.map((c) => [c.systemType, c.id]));
  for (const product of products) {
    const catalogCategoryId = categoryByType.get(product.category) ?? null;
    if (!catalogCategoryId) continue;
    await prisma.product.updateMany({
      where: { slug: product.slug },
      data: { catalogCategoryId },
    });
  }

  await seedHostingCmsPage(prisma);
  await seedMarketingCmsPages(prisma);

  console.log(
    `Seeded ${products.length} products, ${serverPlans.length} server plans, ${hostingPlans.length} hosting plans, ${tldPricing.length} TLD prices, ${navGroups.length} nav groups, CMS pages, and admin user admin@vexirahost.com`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
