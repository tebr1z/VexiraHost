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
    subtitle: "VexiraHost — etibarlı hosting və rəqəmsal xidmətlər",
    legalNameLabel: "Hüquqi ad",
    legalName: "Hashimov Tabriz Yashar fs",
    brandLabel: "Brend",
    brand: "VexiraHost",
    aboutTitle: "Biz kimik?",
    aboutText:
      "VexiraHost olaraq veb saytlar, biznes layihələri və fərdi istifadəçilər üçün sürətli, təhlükəsiz və əlçatan hosting həlləri təqdim edirik. Məqsədimiz texniki mürəkkəbliyi sadələşdirmək, müştərilərə stabil infrastruktur və operativ dəstək verməkdir.",
    servicesTitle: "Xidmətlərimiz",
    services: [
      "Veb hosting və domen xidmətləri",
      "VPS / VDS və bulud serverlər",
      "Windows & Office və digər lisenziya məhsulları",
      "SSL, e-poçt və əlavə IT xidmətləri",
      "Texniki dəstək və sifariş sonrası aktivləşdirmə",
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
    subtitle: "VexiraHost — güvenilir hosting ve dijital hizmetler",
    legalNameLabel: "Yasal unvan",
    legalName: "Hashimov Tabriz Yashar fs",
    brandLabel: "Marka",
    brand: "VexiraHost",
    aboutTitle: "Biz kimiz?",
    aboutText:
      "VexiraHost olarak web siteleri, iş projeleri ve bireysel kullanıcılar için hızlı, güvenli ve erişilebilir hosting çözümleri sunuyoruz. Amacımız teknik karmaşıklığı sadeleştirmek, müşterilere stabil altyapı ve hızlı destek sağlamaktır.",
    servicesTitle: "Hizmetlerimiz",
    services: [
      "Web hosting ve domain hizmetleri",
      "VPS / VDS ve bulut sunucular",
      "Windows & Office ve diğer lisans ürünleri",
      "SSL, e-posta ve ek IT hizmetleri",
      "Teknik destek ve sipariş sonrası aktivasyon",
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
    subtitle: "VexiraHost — reliable hosting and digital services",
    legalNameLabel: "Legal business name",
    legalName: "Hashimov Tabriz Yashar fs",
    brandLabel: "Brand",
    brand: "VexiraHost",
    aboutTitle: "Who we are",
    aboutText:
      "VexiraHost provides fast, secure, and affordable hosting for websites, business projects, and personal use. We focus on stable infrastructure, clear communication, and responsive support.",
    servicesTitle: "Our services",
    services: [
      "Web hosting and domain services",
      "VPS / VDS and cloud servers",
      "Windows & Office and other license products",
      "SSL, email, and add-on IT services",
      "Technical support and post-order activation",
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
    subtitle: "VexiraHost — надёжный хостинг и цифровые услуги",
    legalNameLabel: "Юридическое название",
    legalName: "Hashimov Tabriz Yashar fs",
    brandLabel: "Бренд",
    brand: "VexiraHost",
    aboutTitle: "Кто мы",
    aboutText:
      "VexiraHost предоставляет быстрый, безопасный и доступный хостинг для сайтов, бизнес-проектов и частных пользователей. Мы обеспечиваем стабильную инфраструктуру и оперативную поддержку.",
    servicesTitle: "Наши услуги",
    services: [
      "Веб-хостинг и домены",
      "VPS / VDS и облачные серверы",
      "Windows & Office и другие лицензии",
      "SSL, почта и дополнительные IT-услуги",
      "Техподдержка и активация после заказа",
    ],
    contactTitle: "Контакты",
    addressLabel: "Адрес",
    address: "г. Баку, Сабунчинский район, Бakıxanov, дом 350",
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
