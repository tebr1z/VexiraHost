import { BillingCycle, HostingPanel, PriceCurrency, PricePeriod, PrismaClient, ProductCategory, ServerType, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import { encryptSecret } from "../src/utils/crypto.util";
import { seedHostingCmsPage } from "./cms-hosting-seed";

const prisma = new PrismaClient();

function multiCurrencyPrices(usdMonthly: number) {
  const eurMonthly = Math.round(usdMonthly * 0.92 * 100) / 100;
  const aznMonthly = Math.round(usdMonthly * 1.7 * 100) / 100;
  return [
    { currency: PriceCurrency.USD, period: PricePeriod.MONTHLY, originalPrice: usdMonthly, salePrice: usdMonthly },
    { currency: PriceCurrency.EUR, period: PricePeriod.MONTHLY, originalPrice: eurMonthly, salePrice: eurMonthly },
    { currency: PriceCurrency.AZN, period: PricePeriod.MONTHLY, originalPrice: aznMonthly, salePrice: aznMonthly },
    {
      currency: PriceCurrency.USD,
      period: PricePeriod.YEARLY,
      originalPrice: Math.round(usdMonthly * 12 * 100) / 100,
      salePrice: Math.round(usdMonthly * 10 * 100) / 100,
    },
    {
      currency: PriceCurrency.EUR,
      period: PricePeriod.YEARLY,
      originalPrice: Math.round(eurMonthly * 12 * 100) / 100,
      salePrice: Math.round(eurMonthly * 10 * 100) / 100,
    },
    {
      currency: PriceCurrency.AZN,
      period: PricePeriod.YEARLY,
      originalPrice: Math.round(aznMonthly * 12 * 100) / 100,
      salePrice: Math.round(aznMonthly * 10 * 100) / 100,
    },
  ];
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
    slug: "windows-server-license",
    name: "Windows Server License",
    description: "Windows Server standard license.",
    category: ProductCategory.LICENSE,
    price: 79,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 5,
  },
  {
    slug: "ssl-standard",
    name: "SSL Certificate",
    description: "Standard domain-validated SSL certificate.",
    category: ProductCategory.SSL,
    price: 29,
    billingCycle: BillingCycle.YEARLY,
    sortOrder: 6,
  },
  {
    slug: "email-pro",
    name: "Professional Email",
    description: "Business email hosting with webmail access.",
    category: ProductCategory.EMAIL,
    price: 5,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 7,
  },
  {
    slug: "backup-daily",
    name: "Daily Backup",
    description: "Automated daily backups with 30-day retention.",
    category: ProductCategory.BACKUP,
    price: 9,
    billingCycle: BillingCycle.MONTHLY,
    sortOrder: 8,
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
    description: "Shared cPanel hosting for personal sites and portfolios.",
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
    description: "cPanel hosting with room for multiple sites and email accounts.",
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
    description: "Plesk-powered hosting for agencies and growing businesses.",
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

    for (const price of multiCurrencyPrices(Number(product.price))) {
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
          labels: { tr: "Windows & Office", en: "Windows & Office", az: "Windows və Office", ru: "Windows и Office" },
          href: "/#pricing",
          sortOrder: 1,
        },
        {
          labels: { tr: "Antivirüs", en: "Antivirus", az: "Antivirus", ru: "Антивирус" },
          href: "/#pricing",
          sortOrder: 2,
        },
        {
          labels: { tr: "Diğer Lisanslar", en: "Other Licenses", az: "Digər Lisenziyalar", ru: "Другие лицензии" },
          href: "/#pricing",
          sortOrder: 3,
        },
      ],
    },
    {
      key: "hostingServers",
      labels: { tr: "Hosting & Sunucu", en: "Hosting & Servers", az: "Hosting və Server", ru: "Хостинг и Серверы" },
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
          href: "/hosting",
          pathMatch: "/hosting",
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
      key: "forumBlog",
      labels: { tr: "Forum/Blog", en: "Forum/Blog", az: "Forum/Blog", ru: "Форум/Блог" },
      sortOrder: 3,
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
          href: item.href,
          sortOrder: item.sortOrder,
        },
      });

      if (existingItem) {
        await prisma.navItem.update({
          where: { id: existingItem.id },
          data: {
            labels: item.labels,
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
  }

  await seedHostingCmsPage(prisma);

  console.log(
    `Seeded ${products.length} products, ${serverPlans.length} server plans, ${hostingPlans.length} hosting plans, ${tldPricing.length} TLD prices, ${navGroups.length} nav groups, and admin user admin@vexirahost.com`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
