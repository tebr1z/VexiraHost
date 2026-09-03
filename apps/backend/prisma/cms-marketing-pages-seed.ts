import { CmsSectionType, Prisma, PrismaClient } from "@prisma/client";

type L = { tr: string; en: string; ru: string; az: string };

function l(tr: string, en: string, ru: string, az: string): L {
  return { tr, en, ru, az };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function seedCmsPageIfMissing(
  prisma: PrismaClient,
  slug: string,
  title: L,
  sections: Array<{
    key: string;
    type: CmsSectionType;
    sortOrder: number;
    design?: Record<string, unknown>;
    content: Record<string, unknown>;
  }>,
): Promise<void> {
  const existing = await prisma.cmsPage.findUnique({ where: { slug } });
  if (existing) return;

  await prisma.cmsPage.create({
    data: {
      slug,
      title,
      sections: {
        create: sections.map((section) => ({
          key: section.key,
          type: section.type,
          sortOrder: section.sortOrder,
          design: json(section.design ?? {}),
          content: json(section.content),
        })),
      },
    },
  });
}

async function upsertCmsPage(
  prisma: PrismaClient,
  slug: string,
  title: L,
  sections: Array<{
    key: string;
    type: CmsSectionType;
    sortOrder: number;
    design?: Record<string, unknown>;
    content: Record<string, unknown>;
  }>,
): Promise<void> {
  const page = await prisma.cmsPage.upsert({
    where: { slug },
    update: { title },
    create: { slug, title },
  });

  await prisma.cmsPageSection.deleteMany({ where: { pageId: page.id } });

  for (const section of sections) {
    await prisma.cmsPageSection.create({
      data: {
        pageId: page.id,
        key: section.key,
        type: section.type,
        sortOrder: section.sortOrder,
        design: json(section.design ?? {}),
        content: json(section.content),
      },
    });
  }
}

function catalogSection(
  categorySlug: string,
  anchorId: string,
  eyebrow: L,
  title: L,
  subtitle: L,
  productSlugs?: string[],
): {
  key: string;
  type: CmsSectionType;
  sortOrder: number;
  design: Record<string, unknown>;
  content: Record<string, unknown>;
} {
  const content: Record<string, unknown> = {
    template: "catalog",
    categorySlug,
    anchorId,
    eyebrow,
    title,
    subtitle,
    guarantees: [
      l("Orijinal lisans", "Genuine license", "Оригинальная лицензия", "Orijinal lisenziya"),
      l("Hızlı aktivasyon", "Fast activation", "Быстрая активация", "Sürətli aktivasiya"),
      l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
    ],
    emptyProducts: l(
      "Bu kategoride henüz ürün yok. Yakında güncellenecek.",
      "No products in this category yet. Check back soon.",
      "В этой категории пока нет товаров. Скоро обновим.",
      "Bu kateqoriyada hələ məhsul yoxdur. Tezliklə yenilənəcək.",
    ),
  };
  if (productSlugs?.length) {
    content.productSlugs = productSlugs;
  }
  return {
    key: "products",
    type: CmsSectionType.CUSTOM,
    sortOrder: 1,
    design: { padding: "lg", columns: 3 },
    content,
  };
}

function licenseSubPageSections(
  heroTitle: L,
  heroSubtitle: L,
  categorySlug: string,
  anchorId: string,
  eyebrow: L,
  catalogTitle: L,
  catalogSubtitle: L,
  productSlugs: string[],
) {
  return [
    {
      key: "hero",
      type: CmsSectionType.HERO,
      sortOrder: 0,
      design: { variant: "gradient", padding: "lg" },
      content: {
        discountBadge: l(
          "Orijinal yazılım lisansı",
          "Genuine software license",
          "Оригинальная лицензия ПО",
          "Orijinal proqram lisenziyası",
        ),
        title: heroTitle,
        subtitle: heroSubtitle,
        perks: [
          l("Anında teslim", "Instant delivery", "Мгновенная доставка", "Ani çatdırılma"),
          l("Orijinal anahtar", "Genuine key", "Оригинальный ключ", "Orijinal açar"),
          l("Panelden yönetim", "Panel management", "Управление в панели", "Paneldən idarə"),
          l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
        ],
        ctaPrimary: l("Paketleri gör", "See plans", "Смотреть тарифы", "Paketlara bax"),
        ctaPrimaryHref: `#${anchorId}`,
        ctaSecondary: l("Tüm lisanslar", "All licenses", "Все лицензии", "Bütün lisenziyalar"),
        ctaSecondaryHref: "/licenses",
        moneyBack: l(
          "Güvenli ödeme ve faturalandırma",
          "Secure payment and invoicing",
          "Безопасная оплата и счета",
          "Təhlükəsiz ödəniş və faktura",
        ),
      },
    },
    catalogSection(categorySlug, anchorId, eyebrow, catalogTitle, catalogSubtitle, productSlugs),
  ];
}

export async function seedLicensesCmsPage(prisma: PrismaClient): Promise<void> {
  await seedCmsPageIfMissing(
    prisma,
    "licenses",
    l("Lisanslar", "Licenses", "Лицензии", "Lisenziyalar"),
    [
      {
        key: "hero",
        type: CmsSectionType.HERO,
        sortOrder: 0,
        design: { variant: "gradient", padding: "lg" },
        content: {
          discountBadge: l(
            "Kurumsal yazılım lisansları",
            "Enterprise software licenses",
            "Корпоративные лицензии",
            "Korporativ proqram lisenziyaları",
          ),
          title: l("Lisanslar", "Licenses", "Лицензии", "Lisenziyalar"),
          subtitle: l(
            "Windows, Office, antivirüs ve diğer yazılımlar — tek panelden yönetin.",
            "Windows, Office, antivirus, and more — manage everything in one panel.",
            "Windows, Office, антивирус и другое — всё в одной панели.",
            "Windows, Office, antivirus və digər proqramlar — hamısı bir paneldə.",
          ),
          perks: [
            l("Anında teslim", "Instant delivery", "Мгновенная доставка", "Ani çatdırılma"),
            l("Orijinal anahtarlar", "Genuine keys", "Оригинальные ключи", "Orijinal açarlar"),
            l("Panelden yönetim", "Panel management", "Управление в панели", "Paneldən idarə"),
            l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
          ],
          ctaPrimary: l("Ürünlere bak", "Browse products", "Смотреть продукты", "Məhsullara bax"),
          ctaPrimaryHref: "#license-products",
          ctaSecondary: l("Hesap oluştur", "Create account", "Создать аккаунт", "Hesab yarat"),
          ctaSecondaryHref: "/register",
          moneyBack: l(
            "Güvenli ödeme ve faturalandırma",
            "Secure payment and invoicing",
            "Безопасная оплата и счета",
            "Təhlükəsiz ödəniş və faktura",
          ),
        },
      },
      {
        key: "products",
        type: CmsSectionType.CUSTOM,
        sortOrder: 1,
        design: { padding: "lg", columns: 3 },
        content: {
          template: "catalog",
          categorySlug: "license",
          anchorId: "license-products",
          eyebrow: l(
            "Yazılım lisansları",
            "Software licenses",
            "Лицензии ПО",
            "Proqram lisenziyaları",
          ),
          title: l(
            "İhtiyacınıza uygun lisansı seçin",
            "Choose the license that fits your stack",
            "Выберите подходящую лицензию",
            "Stack-inizə uyğun lisenziyanı seçin",
          ),
          subtitle: l(
            "Bu kategorideki ürünler burada listelenir.",
            "Products in this category appear here automatically.",
            "Товары этой категории отображаются здесь автоматически.",
            "Bu kateqoriyadakı məhsullar burada avtomatik görünür.",
          ),
          guarantees: [
            l("Orijinal lisans", "Genuine license", "Оригинальная лицензия", "Orijinal lisenziya"),
            l("Hızlı aktivasyon", "Fast activation", "Быстрая активация", "Sürətli aktivasiya"),
            l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
          ],
          emptyProducts: l(
            "Henüz lisans ürünü yok. Yakında güncellenecek.",
            "No license products yet. Check back soon.",
            "Лицензий пока нет. Скоро обновим.",
            "Hələ lisenziya məhsulu yoxdur. Tezliklə yenilənəcək.",
          ),
        },
      },
      {
        key: "included",
        type: CmsSectionType.INCLUDED,
        sortOrder: 2,
        design: { columns: 3, padding: "md" },
        content: {
          title: l(
            "Her lisansla birlikte",
            "Included with every license",
            "С каждой лицензией",
            "Hər lisenziya ilə birlikdə",
          ),
          items: [
            {
              icon: "verified",
              label: l(
                "Yetkili dağıtım kanalları",
                "Authorized distribution channels",
                "Официальные каналы",
                "Rəsmi paylama kanalları",
              ),
            },
            {
              icon: "mark_email_read",
              label: l(
                "E-posta / panel teslimatı",
                "Email / panel delivery",
                "Доставка по email / в панели",
                "E-poçt / panel çatdırılması",
              ),
            },
            {
              icon: "receipt_long",
              label: l(
                "Fatura ve aktivasyon kaydı",
                "Invoice and activation records",
                "Счёт и запись активации",
                "Faktura və aktivasiya qeydi",
              ),
            },
            {
              icon: "support_agent",
              label: l(
                "Kurulum desteği",
                "Setup assistance",
                "Помощь с установкой",
                "Quraşdırma dəstəyi",
              ),
            },
            {
              icon: "security",
              label: l(
                "Güvenli ödeme",
                "Secure checkout",
                "Безопасная оплата",
                "Təhlükəsiz ödəniş",
              ),
            },
            {
              icon: "inventory_2",
              label: l(
                "Tek yerden yönetim",
                "Centralized management",
                "Единое управление",
                "Mərkəzləşdirilmiş idarə",
              ),
            },
          ],
        },
      },
      {
        key: "faq",
        type: CmsSectionType.FAQ,
        sortOrder: 3,
        design: { padding: "lg" },
        content: {
          title: l("Lisans SSS", "License FAQ", "FAQ по лицензиям", "Lisenziya FAQ"),
          items: [
            {
              question: l(
                "Lisans nasıl teslim edilir?",
                "How is the license delivered?",
                "Как доставляется лицензия?",
                "Lisenziya necə çatdırılır?",
              ),
              answer: l(
                "Ödeme sonrası anahtar veya dosya müşteri paneline ve e-postanıza iletilir.",
                "After payment, the key or file is sent to your customer panel and email.",
                "После оплаты ключ или файл появится в панели и на email.",
                "Ödənişdən sonra açar və ya fayl müştəri panelinə və e-poçtunuza göndərilir.",
              ),
            },
            {
              question: l(
                "Yeni ürün nasıl eklenir?",
                "How do I add a new product?",
                "Как добавить новый товар?",
                "Yeni məhsulu necə əlavə edirəm?",
              ),
              answer: l(
                "Lisans ürünleri bu sayfada otomatik listelenir.",
                "License products appear on this page automatically.",
                "Товары категории License отображаются на этой странице автоматически.",
                "Lisenziya məhsulları bu səhifədə avtomatik görünür.",
              ),
            },
          ],
        },
      },
    ],
  );
}

export async function seedEmailCmsPage(prisma: PrismaClient): Promise<void> {
  await upsertCmsPage(
    prisma,
    "email",
    l("Google Workspace", "Google Workspace", "Google Workspace", "Google Workspace"),
    [
      {
        key: "hero",
        type: CmsSectionType.HERO,
        sortOrder: 0,
        design: { variant: "gradient", padding: "lg" },
        content: {
          discountBadge: l(
            "Kurumsal e-posta",
            "Business email",
            "Корпоративная почта",
            "Korporativ e-poçt",
          ),
          title: l("Google Workspace", "Google Workspace", "Google Workspace", "Google Workspace"),
          subtitle: l(
            "Gmail, Drive, Meet ve takvim — markanıza özel @alanadiniz.com adresleri.",
            "Gmail, Drive, Meet, and Calendar — branded @yourdomain.com addresses.",
            "Gmail, Drive, Meet и календарь — корпоративные адреса @вашдомен.com.",
            "Gmail, Drive, Meet və təqvim — @domeniniz.com ünvanları.",
          ),
          perks: [
            l("Gmail kurumsal", "Business Gmail", "Корпоративный Gmail", "Korporativ Gmail"),
            l("Drive & Meet", "Drive & Meet", "Drive и Meet", "Drive və Meet"),
            l("Admin konsolu", "Admin console", "Консоль администратора", "Admin konsolu"),
            l("Mobil senkron", "Mobile sync", "Синхронизация с телефоном", "Mobil sinxron"),
          ],
          ctaPrimary: l("Paketleri gör", "See plans", "Смотреть тарифы", "Paketlara bax"),
          ctaPrimaryHref: "#email-products",
          ctaSecondary: l("Hesap oluştur", "Create account", "Создать аккаунт", "Hesab yarat"),
          ctaSecondaryHref: "/register",
          moneyBack: l(
            "Kurumsal iletişim için hazır",
            "Ready for business communication",
            "Готово к бизнес-коммуникации",
            "Biznes ünsiyyəti üçün hazır",
          ),
        },
      },
      {
        key: "products",
        type: CmsSectionType.CUSTOM,
        sortOrder: 1,
        design: { padding: "lg", columns: 3 },
        content: {
          template: "catalog",
          categorySlug: "email",
          anchorId: "email-products",
          productSlugs: ["google-workspace"],
          eyebrow: l(
            "Google Workspace",
            "Google Workspace",
            "Google Workspace",
            "Google Workspace",
          ),
          title: l(
            "Google Workspace paketleri",
            "Google Workspace plans",
            "Тарифы Google Workspace",
            "Google Workspace paketləri",
          ),
          subtitle: l(
            "Alan adınıza bağlı Gmail, Drive ve işbirliği araçları.",
            "Gmail, Drive, and collaboration tied to your domain.",
            "Gmail, Drive и совместная работа на вашем домене.",
            "Domeninizə bağlı Gmail, Drive və əməkdaşlıq alətləri.",
          ),
          guarantees: [
            l("Özel alan adı", "Custom domain", "Свой домен", "Özəl domen"),
            l(
              "Web / mobil erişim",
              "Web & mobile access",
              "Веб и мобильный доступ",
              "Veb və mobil giriş",
            ),
            l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
          ],
          emptyProducts: l(
            "Henüz e-posta ürünü yok. Yakında güncellenecek.",
            "No email products yet. Check back soon.",
            "Почтовых продуктов пока нет. Добавьте в категории Email.",
            "Hələ e-poçt məhsulu yoxdur. Tezliklə yenilənəcək.",
          ),
        },
      },
      {
        key: "included",
        type: CmsSectionType.INCLUDED,
        sortOrder: 2,
        design: { columns: 3, padding: "md" },
        content: {
          title: l(
            "E-posta paketlerinde neler var?",
            "What’s included in email packs?",
            "Что входит в почтовые пакеты?",
            "E-poçt paketlərində nələr var?",
          ),
          items: [
            {
              icon: "mail",
              label: l(
                "alanadiniz@sirket.com formatı",
                "you@yourcompany.com addresses",
                "Адреса вида you@company.com",
                "siz@sirketiniz.com ünvanları",
              ),
            },
            {
              icon: "web",
              label: l(
                "Tarayıcıdan Webmail",
                "Browser webmail",
                "Webmail в браузере",
                "Brauzerdən Webmail",
              ),
            },
            {
              icon: "workspace_premium",
              label: l(
                "Google Workspace seçeneği",
                "Google Workspace option",
                "Вариант Google Workspace",
                "Google Workspace seçimi",
              ),
            },
            {
              icon: "shield",
              label: l(
                "Spam ve kimlik avı koruması",
                "Spam and phishing protection",
                "Защита от спама и фишинга",
                "Spam və fişinq qorunması",
              ),
            },
            {
              icon: "smartphone",
              label: l(
                "Telefon ve tablet senkronu",
                "Phone and tablet sync",
                "Синхронизация с телефоном",
                "Telefon və planşet sinxronu",
              ),
            },
            {
              icon: "support_agent",
              label: l(
                "Kurulum ve DNS yardımı",
                "Setup and DNS help",
                "Помощь с DNS и настройкой",
                "Quraşdırma və DNS yardımı",
              ),
            },
          ],
        },
      },
    ],
  );
}

export async function seedWebmailCmsPage(prisma: PrismaClient): Promise<void> {
  await seedCmsPageIfMissing(prisma, "webmail", l("Webmail", "Webmail", "Webmail", "Webmail"), [
    {
      key: "hero",
      type: CmsSectionType.HERO,
      sortOrder: 0,
      design: { variant: "gradient", padding: "lg" },
      content: {
        discountBadge: l(
          "Kurumsal webmail",
          "Business webmail",
          "Корпоративный webmail",
          "Korporativ webmail",
        ),
        title: l("Webmail", "Webmail", "Webmail", "Webmail"),
        subtitle: l(
          "Alan adınıza özel e-posta kutuları — tarayıcıdan ve mobil cihazlardan erişin.",
          "Branded mailboxes on your domain — access from browser and mobile.",
          "Почтовые ящики на вашем домене — доступ из браузера и телефона.",
          "Domeninizə xüsusi poçt qutuları — brauzer və mobildən giriş.",
        ),
        perks: [
          l("Özel alan adı", "Custom domain", "Свой домен", "Özəl domen"),
          l("Tarayıcı erişimi", "Browser access", "Доступ в браузере", "Brauzer girişi"),
          l("Spam koruması", "Spam protection", "Защита от спама", "Spam qorunması"),
          l("Mobil senkron", "Mobile sync", "Синхронизация с телефоном", "Mobil sinxron"),
        ],
        ctaPrimary: l("Paketleri gör", "See plans", "Смотреть тарифы", "Paketlara bax"),
        ctaPrimaryHref: "#webmail-products",
        ctaSecondary: l("Hesap oluştur", "Create account", "Создать аккаунт", "Hesab yarat"),
        ctaSecondaryHref: "/register",
        moneyBack: l(
          "Kurumsal iletişim için hazır",
          "Ready for business communication",
          "Готово к бизнес-коммуникации",
          "Biznes ünsiyyəti üçün hazır",
        ),
      },
    },
    catalogSection(
      "email",
      "webmail-products",
      l("Webmail paketleri", "Webmail plans", "Тарифы Webmail", "Webmail paketləri"),
      l(
        "Profesyonel webmail paketleri",
        "Professional webmail plans",
        "Профессиональные тарифы Webmail",
        "Peşəkar webmail paketləri",
      ),
      l(
        "Markanıza özel e-posta adresleri ve webmail paneli.",
        "Branded email addresses and a webmail panel.",
        "Корпоративные адреса и панель webmail.",
        "Brendinizə xas e-poçt ünvanları və webmail paneli.",
      ),
      ["email-pro"],
    ),
    {
      key: "included",
      type: CmsSectionType.INCLUDED,
      sortOrder: 2,
      design: { columns: 3, padding: "md" },
      content: {
        title: l(
          "Webmail paketlerinde neler var?",
          "What's included in webmail plans?",
          "Что входит в тарифы Webmail?",
          "Webmail paketlərində nələr var?",
        ),
        items: [
          {
            icon: "mail",
            label: l(
              "alanadiniz@sirket.com formatı",
              "you@yourcompany.com addresses",
              "Адреса вида you@company.com",
              "siz@sirketiniz.com ünvanları",
            ),
          },
          {
            icon: "web",
            label: l(
              "Tarayıcıdan Webmail",
              "Browser webmail",
              "Webmail в браузере",
              "Brauzerdən Webmail",
            ),
          },
          {
            icon: "shield",
            label: l(
              "Spam ve kimlik avı koruması",
              "Spam and phishing protection",
              "Защита от спама и фишинга",
              "Spam və fişinq qorunması",
            ),
          },
          {
            icon: "smartphone",
            label: l(
              "Telefon ve tablet senkronu",
              "Phone and tablet sync",
              "Синхронизация с телефоном",
              "Telefon və planşet sinxronu",
            ),
          },
          {
            icon: "dns",
            label: l(
              "MX / DNS kurulum desteği",
              "MX / DNS setup help",
              "Помощь с MX / DNS",
              "MX / DNS quraşdırma dəstəyi",
            ),
          },
          {
            icon: "support_agent",
            label: l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
          },
        ],
      },
    },
  ]);
}

const SERVER_LICENSE_SLUGS = [
  "windows-server-2022-standard",
  "windows-server-2022-datacenter",
  "windows-server-2019-standard",
  "windows-server-2019-datacenter",
  "windows-server-2016-standard",
  "windows-server-2016-datacenter",
];

async function syncCmsPageMeta(
  prisma: PrismaClient,
  slug: string,
  meta: { parentSlug?: string | null; pathSegment?: string | null; sortOrder?: number },
): Promise<void> {
  await prisma.cmsPage.updateMany({
    where: { slug },
    data: meta,
  });
}

export async function seedLicenseSubPages(prisma: PrismaClient): Promise<void> {
  await upsertCmsPage(
    prisma,
    "licenses-windows",
    l("Windows Lisansları", "Windows Licenses", "Лицензии Windows", "Windows Lisenziyaları"),
    [
      {
        key: "hero",
        type: CmsSectionType.HERO,
        sortOrder: 0,
        design: { variant: "gradient", padding: "lg" },
        content: {
          title: l(
            "Windows Lisansları",
            "Windows Licenses",
            "Лицензии Windows",
            "Windows Lisenziyaları",
          ),
          subtitle: l(
            "Windows 11, Windows 8 ve diğer sürümler — ihtiyacınıza uygun lisansı seçin.",
            "Windows 11, Windows 8, and more — pick the license that fits.",
            "Windows 11, Windows 8 и другие версии — выберите подходящую лицензию.",
            "Windows 11, Windows 8 və digər versiyalar — uyğun lisenziyanı seçin.",
          ),
          ctaPrimary: l(
            "Lisanslara bak",
            "Browse licenses",
            "Смотреть лицензии",
            "Lisenziyalara bax",
          ),
          ctaPrimaryHref: "#windows-licenses",
          ctaSecondary: l("Tüm lisanslar", "All licenses", "Все лицензии", "Bütün lisenziyalar"),
          ctaSecondaryHref: "/licenses",
        },
      },
      {
        key: "children",
        type: CmsSectionType.CUSTOM,
        sortOrder: 1,
        design: { padding: "lg" },
        content: {
          template: "child-pages",
          parentSlug: "licenses-windows",
          anchorId: "windows-licenses",
          title: l(
            "Windows lisans kategorileri",
            "Windows license categories",
            "Категории лицензий Windows",
            "Windows lisenziya kateqoriyaları",
          ),
          subtitle: l(
            "Windows lisans sayfaları burada listelenir.",
            "Windows license pages are listed here.",
            "Страницы лицензий Windows отображаются здесь.",
            "Windows lisenziya səhifələri burada siyahılanır.",
          ),
          emptyMessage: l(
            "Henüz Windows lisans sayfası yok. Yakında güncellenecek.",
            "No Windows license pages yet. Check back soon.",
            "Страниц лицензий Windows пока нет. Скоро обновим.",
            "Hələ Windows lisenziya səhifəsi yoxdur. Tezliklə yenilənəcək.",
          ),
        },
      },
    ],
  );

  await prisma.cmsPage.update({
    where: { slug: "licenses-windows" },
    data: { pathSegment: "windows", parentSlug: null, sortOrder: 0 },
  });

  const pages: Array<{
    slug: string;
    title: L;
    sections: ReturnType<typeof licenseSubPageSections>;
    pathSegment: string;
    parentSlug?: string | null;
    sortOrder: number;
  }> = [
    {
      slug: "licenses-windows-11-pro",
      pathSegment: "windows-11-pro",
      parentSlug: "licenses-windows",
      sortOrder: 1,
      title: l("Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro"),
      sections: licenseSubPageSections(
        l("Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro"),
        l(
          "Profesyonel ve iş istasyonları için Windows 11 Pro lisansları.",
          "Windows 11 Pro licenses for professionals and workstations.",
          "Лицензии Windows 11 Pro для профессионалов и рабочих станций.",
          "Peşəkarlar və iş stansiyaları üçün Windows 11 Pro lisenziyaları.",
        ),
        "license",
        "windows-11-pro-products",
        l("Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro", "Windows 11 Pro"),
        l(
          "Windows 11 Pro lisansları",
          "Windows 11 Pro licenses",
          "Лицензии Windows 11 Pro",
          "Windows 11 Pro lisenziyaları",
        ),
        l(
          "BitLocker, Uzak Masaüstü ve gelişmiş güvenlik özellikleri.",
          "BitLocker, Remote Desktop, and advanced security features.",
          "BitLocker, удалённый рабочий стол и расширенная безопасность.",
          "BitLocker, Uzaq Masaüstü və təkmil təhlükəsizlik.",
        ),
        ["windows-11-pro"],
      ),
    },
    {
      slug: "licenses-windows-11-home",
      pathSegment: "windows-11-home",
      parentSlug: "licenses-windows",
      sortOrder: 2,
      title: l("Windows 11 Home", "Windows 11 Home", "Windows 11 Home", "Windows 11 Home"),
      sections: licenseSubPageSections(
        l("Windows 11 Home", "Windows 11 Home", "Windows 11 Home", "Windows 11 Home"),
        l(
          "Ev ve kişisel kullanım için Windows 11 Home lisansları.",
          "Windows 11 Home licenses for home and personal use.",
          "Лицензии Windows 11 Home для дома и личного использования.",
          "Ev və şəxsi istifadə üçün Windows 11 Home lisenziyaları.",
        ),
        "license",
        "windows-11-home-products",
        l("Windows 11 Home", "Windows 11 Home", "Windows 11 Home", "Windows 11 Home"),
        l(
          "Windows 11 Home lisansları",
          "Windows 11 Home licenses",
          "Лицензии Windows 11 Home",
          "Windows 11 Home lisenziyaları",
        ),
        l(
          "Günlük kullanım, oyun ve ev ofisi için ideal.",
          "Ideal for everyday use, gaming, and home office.",
          "Идеально для повседневной работы, игр и домашнего офиса.",
          "Gündəlik istifadə, oyun və ev ofisi üçün ideal.",
        ),
        ["windows-11-home"],
      ),
    },
    {
      slug: "licenses-windows-8",
      pathSegment: "windows-8",
      parentSlug: "licenses-windows",
      sortOrder: 3,
      title: l("Windows 8", "Windows 8", "Windows 8", "Windows 8"),
      sections: licenseSubPageSections(
        l("Windows 8", "Windows 8", "Windows 8", "Windows 8"),
        l(
          "Eski sistemler ve uyumluluk için Windows 8 lisansları.",
          "Windows 8 licenses for legacy systems and compatibility.",
          "Лицензии Windows 8 для устаревших систем и совместимости.",
          "Köhnə sistemlər və uyğunluq üçün Windows 8 lisenziyaları.",
        ),
        "license",
        "windows-8-products",
        l("Windows 8", "Windows 8", "Windows 8", "Windows 8"),
        l(
          "Windows 8 lisansları",
          "Windows 8 licenses",
          "Лицензии Windows 8",
          "Windows 8 lisenziyaları",
        ),
        l(
          "Mevcut donanımınız için orijinal aktivasyon anahtarları.",
          "Genuine activation keys for your existing hardware.",
          "Оригинальные ключи активации для вашего оборудования.",
          "Mövcud avadanlığınız üçün orijinal aktivasiya açarları.",
        ),
        ["windows-8"],
      ),
    },
    {
      slug: "licenses-server",
      pathSegment: "server",
      parentSlug: null,
      sortOrder: 10,
      title: l(
        "Server Lisansları",
        "Server Licenses",
        "Серверные лицензии",
        "Server Lisenziyaları",
      ),
      sections: licenseSubPageSections(
        l("Server Lisansları", "Server Licenses", "Серверные лицензии", "Server Lisenziyaları"),
        l(
          "Windows Server 2022, 2019 ve 2016 — Standard ve Datacenter sürümleri.",
          "Windows Server 2022, 2019, and 2016 — Standard and Datacenter editions.",
          "Windows Server 2022, 2019 и 2016 — Standard и Datacenter.",
          "Windows Server 2022, 2019 və 2016 — Standard və Datacenter.",
        ),
        "license",
        "server-license-products",
        l("Windows Server", "Windows Server", "Windows Server", "Windows Server"),
        l(
          "Server lisans paketleri",
          "Server license plans",
          "Серверные лицензии",
          "Server lisenziya paketləri",
        ),
        l(
          "Fiziksel ve sanal sunucular için orijinal Windows Server anahtarları.",
          "Genuine Windows Server keys for physical and virtual servers.",
          "Оригинальные ключи Windows Server для физических и виртуальных серверов.",
          "Fiziki və virtual serverlər üçün orijinal Windows Server açarları.",
        ),
        SERVER_LICENSE_SLUGS,
      ),
    },
    {
      slug: "licenses-antivirus",
      pathSegment: "antivirus",
      parentSlug: null,
      sortOrder: 12,
      title: l("Antivirüs", "Antivirus", "Антивирус", "Antivirus"),
      sections: licenseSubPageSections(
        l(
          "Antivirüs Lisansları",
          "Antivirus Licenses",
          "Антивирусные лицензии",
          "Antivirus Lisenziyaları",
        ),
        l(
          "İş istasyonları ve sunucular için kurumsal antivirüs koruması.",
          "Enterprise antivirus protection for workstations and servers.",
          "Корпоративная антивирусная защита для рабочих станций и серверов.",
          "İş stansiyaları və serverlər üçün korporativ antivirus qorunması.",
        ),
        "license",
        "antivirus-products",
        l("Antivirüs", "Antivirus", "Антивирус", "Antivirus"),
        l(
          "Antivirüs lisansları",
          "Antivirus licenses",
          "Антивирусные лицензии",
          "Antivirus lisenziyaları",
        ),
        l(
          "Gerçek zamanlı tehdit koruması ve merkezi yönetim.",
          "Real-time threat protection and centralized management.",
          "Защита в реальном времени и централизованное управление.",
          "Real vaxt təhdid qorunması və mərkəzləşdirilmiş idarəetmə.",
        ),
        ["antivirus-pro"],
      ),
    },
    {
      slug: "licenses-office",
      pathSegment: "office",
      parentSlug: null,
      sortOrder: 11,
      title: l("Microsoft Office", "Microsoft Office", "Microsoft Office", "Microsoft Office"),
      sections: licenseSubPageSections(
        l("Microsoft Office", "Microsoft Office", "Microsoft Office", "Microsoft Office"),
        l(
          "Word, Excel, PowerPoint ve Outlook — iş masaüstü lisansları.",
          "Word, Excel, PowerPoint, and Outlook — desktop business licenses.",
          "Word, Excel, PowerPoint и Outlook — лицензии для бизнеса.",
          "Word, Excel, PowerPoint və Outlook — iş masaüstü lisenziyaları.",
        ),
        "license",
        "office-products",
        l("Microsoft Office", "Microsoft Office", "Microsoft Office", "Microsoft Office"),
        l("Office lisansları", "Office licenses", "Лицензии Office", "Office lisenziyaları"),
        l(
          "Windows ve Mac uyumlu, anında teslim.",
          "Windows and Mac compatible, instant delivery.",
          "Совместимость с Windows и Mac, мгновенная доставка.",
          "Windows və Mac uyğunluğu, ani çatdırılma.",
        ),
        ["office-365-license"],
      ),
    },
  ];

  for (const page of pages) {
    await seedCmsPageIfMissing(prisma, page.slug, page.title, page.sections);
    await syncCmsPageMeta(prisma, page.slug, {
      pathSegment: page.pathSegment,
      parentSlug: page.parentSlug ?? null,
      sortOrder: page.sortOrder ?? 0,
    });
  }
}

export async function seedVpsCmsPage(prisma: PrismaClient): Promise<void> {
  await seedCmsPageIfMissing(prisma, "vps", l("VDS / VPS", "VDS / VPS", "VDS / VPS", "VDS / VPS"), [
    {
      key: "hero",
      type: CmsSectionType.HERO,
      sortOrder: 0,
      design: { variant: "gradient", padding: "lg" },
      content: {
        discountBadge: l(
          "Tam root erişim",
          "Full root access",
          "Полный root-доступ",
          "Tam root giriş",
        ),
        title: l("VDS / VPS", "VDS / VPS", "VDS / VPS", "VDS / VPS"),
        subtitle: l(
          "İzole kaynaklar, NVMe disk ve dakikalar içinde hazır sunucu.",
          "Isolated resources, NVMe storage, and a server ready in minutes.",
          "Изолированные ресурсы, NVMe и сервер за минуты.",
          "İzolyasiya olunmuş resurslar, NVMe yaddaş və dəqiqələr içində hazır server.",
        ),
        perks: [
          l(
            "Root / admin erişimi",
            "Root / admin access",
            "Root / admin доступ",
            "Root / admin giriş",
          ),
          l("NVMe SSD", "NVMe SSD", "NVMe SSD", "NVMe SSD"),
          l("Anında ölçekleme", "Instant scaling", "Мгновенное масштабирование", "Ani miqyaslama"),
          l("7/24 izleme", "24/7 monitoring", "Мониторинг 24/7", "7/24 monitorinq"),
        ],
        ctaPrimary: l("Planları gör", "See plans", "Смотреть тарифы", "Planlara bax"),
        ctaPrimaryHref: "#vps-products",
        ctaSecondary: l("Hesap oluştur", "Create account", "Создать аккаунт", "Hesab yarat"),
        ctaSecondaryHref: "/register",
        moneyBack: l(
          "Üretim için hazır altyapı",
          "Production-ready infrastructure",
          "Инфраструктура для продакшена",
          "Production üçün hazır infrastruktur",
        ),
      },
    },
    {
      key: "products",
      type: CmsSectionType.CUSTOM,
      sortOrder: 1,
      design: { padding: "lg", columns: 3 },
      content: {
        template: "catalog",
        categorySlug: "vps",
        anchorId: "vps-products",
        eyebrow: l("Bulut sunucular", "Cloud servers", "Облачные серверы", "Bulud serverlər"),
        title: l(
          "VDS / VPS planınızı seçin",
          "Pick your VDS / VPS plan",
          "Выберите план VDS / VPS",
          "VDS / VPS planınızı seçin",
        ),
        subtitle: l(
          "VPS ürünleri bu sayfada listelenir.",
          "Add products under the VPS category in admin — they list on this page.",
          "Добавляйте товары в категорию VPS — они появятся здесь.",
          "VPS məhsulları bu səhifədə görünür.",
        ),
        guarantees: [
          l("Tam root", "Full root", "Полный root", "Tam root"),
          l("Anında kurulum", "Instant deploy", "Мгновенный деплой", "Ani quraşdırma"),
          l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
        ],
        emptyProducts: l(
          "Henüz VPS ürünü yok. Yakında güncellenecek.",
          "No VPS products yet. Check back soon.",
          "VPS-товаров пока нет. Добавьте в категории VPS.",
          "Hələ VPS məhsulu yoxdur. Tezliklə yenilənəcək.",
        ),
      },
    },
    {
      key: "included",
      type: CmsSectionType.INCLUDED,
      sortOrder: 2,
      design: { columns: 3, padding: "md" },
      content: {
        title: l("Her VPS planında", "On every VPS plan", "В каждом VPS-плане", "Hər VPS planında"),
        items: [
          {
            icon: "terminal",
            label: l(
              "SSH / RDP erişimi",
              "SSH / RDP access",
              "Доступ SSH / RDP",
              "SSH / RDP giriş",
            ),
          },
          {
            icon: "memory",
            label: l(
              "Garantili CPU & RAM",
              "Guaranteed CPU & RAM",
              "Гарантированные CPU и RAM",
              "Zəmanətli CPU və RAM",
            ),
          },
          {
            icon: "database",
            label: l("NVMe depolama", "NVMe storage", "Хранилище NVMe", "NVMe yaddaş"),
          },
          {
            icon: "speed",
            label: l(
              "Yüksek ağ hızı",
              "High network speed",
              "Высокая скорость сети",
              "Yüksək şəbəkə sürəti",
            ),
          },
          {
            icon: "snapshot",
            label: l(
              "Anlık görüntü seçenekleri",
              "Snapshot options",
              "Снимки диска",
              "Snapshot seçimləri",
            ),
          },
          {
            icon: "support_agent",
            label: l(
              "7/24 teknik destek",
              "24/7 technical support",
              "Техподдержка 24/7",
              "7/24 texniki dəstək",
            ),
          },
        ],
      },
    },
    {
      key: "features",
      type: CmsSectionType.FEATURES,
      sortOrder: 3,
      design: { layout: "alternating", padding: "lg" },
      content: {
        blocks: [
          {
            icon: "dns",
            layout: "left",
            title: l(
              "İzole performans",
              "Isolated performance",
              "Изолированная производительность",
              "İzolyasiya olunmuş performans",
            ),
            description: l(
              "Komşularınızın trafiği sizi yavaşlatmasın — ayrılmış kaynaklarla çalışın.",
              "Neighbor traffic won’t slow you down — run on dedicated resources.",
              "Соседи не замедлят вас — работайте на выделенных ресурсах.",
              "Qonşu trafik sizi yavaşlatmasın — ayrılmış resurslarla işləyin.",
            ),
            bullets: [
              l("Özel vCPU", "Dedicated vCPU", "Выделенный vCPU", "Xüsusi vCPU"),
              l("Sabit RAM", "Fixed RAM", "Фиксированная RAM", "Sabit RAM"),
              l(
                "Öngörülebilir I/O",
                "Predictable I/O",
                "Предсказуемый I/O",
                "Proqnozlaşdırıla bilən I/O",
              ),
            ],
          },
          {
            icon: "rocket_launch",
            layout: "right",
            title: l(
              "Dakikalar içinde yayında",
              "Live in minutes",
              "В эфире за минуты",
              "Dəqiqələr içində yayımda",
            ),
            description: l(
              "Sipariş sonrası sunucunuz hazır; OS imajı ve erişim bilgileri panelinizde.",
              "After order, your server is ready; OS image and credentials are in your panel.",
              "После заказа сервер готов; образ ОС и доступы — в панели.",
              "Sifarişdən sonra serveriniz hazırdır; OS image və giriş məlumatları paneldədir.",
            ),
            bullets: [
              l(
                "Hızlı provisioning",
                "Fast provisioning",
                "Быстрый провижининг",
                "Sürətli provisioning",
              ),
              l("Esnek OS seçimi", "Flexible OS choice", "Гибкий выбор ОС", "Çevik OS seçimi"),
              l(
                "Ölçeklenebilir planlar",
                "Scalable plans",
                "Масштабируемые планы",
                "Miqyaslana bilən planlar",
              ),
            ],
          },
        ],
      },
    },
  ]);
}

export async function seedMarketingCmsPages(prisma: PrismaClient): Promise<void> {
  await seedLicensesCmsPage(prisma);
  await seedLicenseSubPages(prisma);
  await seedEmailCmsPage(prisma);
  await seedWebmailCmsPage(prisma);
  await seedVpsCmsPage(prisma);
}
