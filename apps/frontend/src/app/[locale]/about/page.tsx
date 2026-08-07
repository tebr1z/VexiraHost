import { getLocale } from "next-intl/server";

import { MarketingShell } from "@/components/layout/marketing-shell";

const WHATSAPP = "994709646466";
const PHONE = "+994709646466";
const EMAIL = "admin@vexirahost.com";

type AboutContent = {
  title: string;
  subtitle: string;
  legalNameLabel: string;
  legalName: string;
  brandLabel: string;
  brand: string;
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  services: string[];
  contactTitle: string;
  addressLabel: string;
  address: string;
  phoneLabel: string;
  whatsappLabel: string;
  emailLabel: string;
  whatsappCta: string;
  hoursTitle: string;
  hours: string;
  responseNote: string;
};

const CONTENT: Record<"tr" | "en" | "ru" | "az", AboutContent> = {
  az: {
    title: "Haqqımızda",
    subtitle: "Vexira Labs LLC — 2021-dən bu yana texnologiya və infrastruktur",
    legalNameLabel: "Hüquqi ad",
    legalName: "Vexira Labs LLC",
    brandLabel: "Brend",
    brand: "Vexira Host",
    aboutTitle: "Biz kimik?",
    aboutText:
      "Vexira Labs LLC 2021-ci ildə təsis olunub. İlk gündən şirkətlərə lisenziyalar, IT həlləri, şəbəkə təhlükəsizliyi, bulud sistemləri, SEO və server optimizasiyası, daxili təhlükəsiz şəbəkə və VPN xidmətlərinin qurulması ilə idarə edilməsi, həmçinin veb, mobil və digər tətbiqlərin hazırlanması üzrə dəstək verdik. 2023-cü ildə bu təcrübəni bir addım irəli apararaq Vexira Host brendini qurduq — hosting, VPS, domen və rəqəmsal məhsulları bir platformada toplayan etibarlı infrastruktur xidməti. Bizim üçün müştəri məmnuniyyəti hər şeydən üstündür: sabit sistem, aydın qiymət və ehtiyac anında real dəstək.",
    servicesTitle: "Xidmətlərimiz",
    services: [
      "Veb hosting, domen və SSL",
      "VPS / VDS və bulud serverlər",
      "Windows, Office və digər proqram lisenziyaları",
      "Şəbəkə təhlükəsizliyi, VPN və daxili təhlükəsiz şəbəkə",
      "SEO, server optimizasiyası və IT dəstək",
      "Veb, mobil və xüsusi tətbiq hazırlanması",
    ],
    contactTitle: "Əlaqə",
    addressLabel: "Ünvan",
    address: "Bakı şəhəri, Sabunçu rayonu, Bakıxanov, ev 350",
    phoneLabel: "Telefon",
    whatsappLabel: "WhatsApp",
    emailLabel: "Dəstək e-poçtu",
    whatsappCta: "WhatsApp ilə yazın",
    hoursTitle: "Dəstək saatları",
    hours: "B.e. – Şənbə, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Sifariş, aktivləşdirmə və texniki suallar üçün WhatsApp və ya e-poçt vasitəsilə bizə yaza bilərsiniz. Komanda mümkün qədər tez cavab verir.",
  },
  tr: {
    title: "Hakkımızda",
    subtitle: "Vexira Labs LLC — 2021’den beri teknoloji ve altyapı",
    legalNameLabel: "Yasal unvan",
    legalName: "Vexira Labs LLC",
    brandLabel: "Marka",
    brand: "Vexira Host",
    aboutTitle: "Biz kimiz?",
    aboutText:
      "Vexira Labs LLC 2021 yılında kuruldu. İlk günden şirketlere lisanslar, IT çözümleri, ağ güvenliği, bulut sistemleri, SEO ve sunucu optimizasyonu; dahili güvenli ağ ve VPN hizmetlerinin kurulumu ile yönetimi; ayrıca web, mobil ve çeşitli uygulama geliştirme desteği sunduk. 2023’te bu birikimi bir adım öteye taşıyarak Vexira Host markasını kurduk — hosting, VPS, domain ve dijital ürünleri tek platformda toplayan güvenilir altyapı hizmeti. Bizim için müşteri memnuniyeti her şeyden üstündür: istikrarlı sistem, net fiyatlandırma ve ihtiyaç anında gerçek destek.",
    servicesTitle: "Hizmetlerimiz",
    services: [
      "Web hosting, domain ve SSL",
      "VPS / VDS ve bulut sunucular",
      "Windows, Office ve diğer yazılım lisansları",
      "Ağ güvenliği, VPN ve dahili güvenli ağ",
      "SEO, sunucu optimizasyonu ve IT destek",
      "Web, mobil ve özel uygulama geliştirme",
    ],
    contactTitle: "İletişim",
    addressLabel: "Adres",
    address: "Bakü şehri, Sabunçu rayonu, Bakıxanov, ev 350",
    phoneLabel: "Telefon",
    whatsappLabel: "WhatsApp",
    emailLabel: "Destek e-postası",
    whatsappCta: "WhatsApp ile yazın",
    hoursTitle: "Destek saatleri",
    hours: "Pzt – Cmt, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Sipariş, aktivasyon ve teknik sorular için WhatsApp veya e-posta ile bize ulaşabilirsiniz. Ekibimiz en kısa sürede yanıt verir.",
  },
  en: {
    title: "About Us",
    subtitle: "Vexira Labs LLC — technology and infrastructure since 2021",
    legalNameLabel: "Legal business name",
    legalName: "Vexira Labs LLC",
    brandLabel: "Brand",
    brand: "Vexira Host",
    aboutTitle: "Who we are",
    aboutText:
      "Vexira Labs LLC was founded in 2021. From day one we helped companies with software licenses, IT solutions, network security, cloud systems, SEO and server optimization, building and managing internal secure networks and VPN services, and delivering web, mobile, and custom applications. In 2023 we took that experience further and launched Vexira Host — a trusted infrastructure brand that brings hosting, VPS, domains, and digital products together on one platform. For us, customer satisfaction comes first: stable systems, clear pricing, and real support when it matters.",
    servicesTitle: "Our services",
    services: [
      "Web hosting, domains, and SSL",
      "VPS / VDS and cloud servers",
      "Windows, Office, and other software licenses",
      "Network security, VPN, and internal secure networks",
      "SEO, server optimization, and IT support",
      "Web, mobile, and custom application development",
    ],
    contactTitle: "Contact",
    addressLabel: "Address",
    address: "Baku city, Sabunchu district, Bakikhanov, house 350",
    phoneLabel: "Phone",
    whatsappLabel: "WhatsApp",
    emailLabel: "Support email",
    whatsappCta: "Message on WhatsApp",
    hoursTitle: "Support hours",
    hours: "Mon – Sat, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "For orders, activation, or technical questions, reach us via WhatsApp or email. Our team responds as quickly as possible.",
  },
  ru: {
    title: "О нас",
    subtitle: "Vexira Labs LLC — технологии и инфраструктура с 2021 года",
    legalNameLabel: "Юридическое название",
    legalName: "Vexira Labs LLC",
    brandLabel: "Бренд",
    brand: "Vexira Host",
    aboutTitle: "Кто мы",
    aboutText:
      "Vexira Labs LLC основана в 2021 году. С первого дня мы помогали компаниям с лицензиями, IT-решениями, сетевой безопасностью, облачными системами, SEO и оптимизацией серверов, построением и сопровождением внутренних защищённых сетей и VPN, а также разработкой веб-, мобильных и других приложений. В 2023 году мы сделали следующий шаг и запустили Vexira Host — бренд надёжной инфраструктуры, объединяющий хостинг, VPS, домены и цифровые продукты на одной платформе. Для нас удовлетворённость клиентов важнее всего: стабильные системы, понятные цены и реальная поддержка в нужный момент.",
    servicesTitle: "Наши услуги",
    services: [
      "Веб-хостинг, домены и SSL",
      "VPS / VDS и облачные серверы",
      "Windows, Office и другие программные лицензии",
      "Сетевая безопасность, VPN и внутренние защищённые сети",
      "SEO, оптимизация серверов и IT-поддержка",
      "Разработка веб-, мобильных и специальных приложений",
    ],
    contactTitle: "Контакты",
    addressLabel: "Адрес",
    address: "г. Баку, Сабунчинский район, Бакиханов, дом 350",
    phoneLabel: "Телефон",
    whatsappLabel: "WhatsApp",
    emailLabel: "Email поддержки",
    whatsappCta: "Написать в WhatsApp",
    hoursTitle: "Часы поддержки",
    hours: "Пн – Сб, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "По заказам, активации и техническим вопросам пишите в WhatsApp или на email. Мы отвечаем максимально быстро.",
  },
};

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4">
      <span className="material-symbols-outlined mt-0.5 text-[22px] text-[var(--accent)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
          {label}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">{children}</div>
      </div>
    </div>
  );
}

export default async function AboutPage(): Promise<React.ReactElement> {
  const locale = await getLocale();
  const c = CONTENT[(locale in CONTENT ? locale : "en") as keyof typeof CONTENT];
  const whatsappUrl = `https://wa.me/${WHATSAPP}`;

  return (
    <MarketingShell>
      <section className="apple-page py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-3 text-base text-[var(--label-secondary)]">{c.subtitle}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                {c.legalNameLabel}
              </p>
              <p className="mt-2 font-medium text-[var(--label)]">{c.legalName}</p>
            </article>
            <article className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                {c.brandLabel}
              </p>
              <p className="mt-2 font-medium text-[var(--label)]">{c.brand}</p>
            </article>
          </div>

          <article className="mt-6 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[var(--label)]">{c.aboutTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
              {c.aboutText}
            </p>
          </article>

          <article className="mt-6 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[var(--label)]">{c.servicesTitle}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
              {c.services.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--label)]">{c.contactTitle}</h2>
            <div className="mt-4 space-y-3">
              <ContactRow icon="location_on" label={c.addressLabel}>
                {c.address}
              </ContactRow>
              <ContactRow icon="call" label={c.phoneLabel}>
                <a
                  href={`tel:${PHONE}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {PHONE}
                </a>
              </ContactRow>
              <ContactRow icon="chat" label={c.whatsappLabel}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
                >
                  {PHONE}
                  <span className="text-xs text-[var(--label-tertiary)]">({c.whatsappCta})</span>
                </a>
              </ContactRow>
              <ContactRow icon="mail" label={c.emailLabel}>
                <a
                  href={`mailto:${EMAIL}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {EMAIL}
                </a>
              </ContactRow>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              {c.whatsappCta}
            </a>
          </div>

          <article className="mt-8 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--label)]">{c.hoursTitle}</h2>
            <p className="mt-2 text-sm text-[var(--label-secondary)]">{c.hours}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--label-tertiary)]">
              {c.responseNote}
            </p>
          </article>
        </div>
      </section>
    </MarketingShell>
  );
}
