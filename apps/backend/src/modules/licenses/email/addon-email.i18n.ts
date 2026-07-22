import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export interface LicenseEmailCopy {
  brandTagline: string;
  title: string;
  subtitle: (name: string, product: string) => string;
  licenseKeyLabel: string;
  copyHint: string;
  downloadLabel: string;
  downloadButton: string;
  orderLabel: string;
  productLabel: string;
  expiresLabel: string;
  dashboardButton: string;
  footer: string;
  noExpiry: string;
}

export interface GenericAddonEmailCopy {
  brandTagline: string;
  title: string;
  subtitle: (name: string, product: string) => string;
  detailsLabel: string;
  dashboardButton: string;
  footer: string;
}

const LICENSE: Record<AuthEmailLocale, LicenseEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: "Your license is ready",
    subtitle: (name, product) =>
      `Hi ${name}, your ${product} license has been activated. Use the key below and download link to get started.`,
    licenseKeyLabel: "Activation key",
    copyHint: "Select the key above and copy it (Ctrl+C / Cmd+C).",
    downloadLabel: "Download",
    downloadButton: "Download software",
    orderLabel: "Order",
    productLabel: "Product",
    expiresLabel: "Valid until",
    dashboardButton: "Open customer panel",
    footer: "You can also view this license anytime in your customer panel under Services.",
    noExpiry: "No expiry",
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    title: "Lisansınız hazır",
    subtitle: (name, product) =>
      `Merhaba ${name}, ${product} lisansınız aktifleştirildi. Aşağıdaki anahtarı kopyalayıp indirme linkinden yazılımı edinebilirsiniz.`,
    licenseKeyLabel: "Aktivasyon anahtarı",
    copyHint: "Anahtarı seçip kopyalayın (Ctrl+C / Cmd+C).",
    downloadLabel: "İndirme",
    downloadButton: "Yazılımı indir",
    orderLabel: "Sipariş",
    productLabel: "Ürün",
    expiresLabel: "Geçerlilik",
    dashboardButton: "Müşteri paneline git",
    footer: "Lisansınızı istediğiniz zaman panelinizde Hizmetler bölümünden de görüntüleyebilirsiniz.",
    noExpiry: "Süresiz",
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    title: "Ваша лицензия готова",
    subtitle: (name, product) =>
      `Здравствуйте, ${name}! Лицензия ${product} активирована. Скопируйте ключ ниже и перейдите по ссылке для загрузки.`,
    licenseKeyLabel: "Ключ активации",
    copyHint: "Выделите ключ и скопируйте (Ctrl+C / Cmd+C).",
    downloadLabel: "Загрузка",
    downloadButton: "Скачать ПО",
    orderLabel: "Заказ",
    productLabel: "Продукт",
    expiresLabel: "Действует до",
    dashboardButton: "Открыть панель",
    footer: "Лицензию также можно посмотреть в разделе «Сервисы» вашей панели.",
    noExpiry: "Без срока",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: "Lisenziyanız hazırdır",
    subtitle: (name, product) =>
      `Salam ${name}, ${product} lisenziyanız aktivləşdirildi. Aşağıdakı açarı kopyalayın və endirmə linkindən istifadə edin.`,
    licenseKeyLabel: "Aktivasiya açarı",
    copyHint: "Açarı seçib kopyalayın (Ctrl+C / Cmd+C).",
    downloadLabel: "Endirmə",
    downloadButton: "Proqramı endir",
    orderLabel: "Sifariş",
    productLabel: "Məhsul",
    expiresLabel: "Etibarlılıq",
    dashboardButton: "Müştəri panelinə keç",
    footer: "Lisenziyanı istənilən vaxt panelinizdə Xidmətlər bölməsindən də görə bilərsiniz.",
    noExpiry: "Müddətsiz",
  },
};

const SSL: Record<AuthEmailLocale, GenericAddonEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: "Your SSL certificate is ready",
    subtitle: (name, product) => `Hi ${name}, ${product} has been provisioned for your domain.`,
    detailsLabel: "Certificate details",
    dashboardButton: "Open customer panel",
    footer: "Manage your SSL services from the customer panel.",
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    title: "SSL sertifikanız hazır",
    subtitle: (name, product) => `Merhaba ${name}, ${product} domaininiz için oluşturuldu.`,
    detailsLabel: "Sertifika bilgileri",
    dashboardButton: "Müşteri paneline git",
    footer: "SSL hizmetlerinizi müşteri panelinden yönetebilirsiniz.",
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    title: "SSL-сертификат готов",
    subtitle: (name, product) => `Здравствуйте, ${name}! ${product} выпущен для вашего домена.`,
    detailsLabel: "Данные сертификата",
    dashboardButton: "Открыть панель",
    footer: "Управляйте SSL в клиентской панели.",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: "SSL sertifikatınız hazırdır",
    subtitle: (name, product) => `Salam ${name}, ${product} domeniniz üçün yaradıldı.`,
    detailsLabel: "Sertifikat məlumatları",
    dashboardButton: "Müştəri panelinə keç",
    footer: "SSL xidmətlərini müştəri panelindən idarə edin.",
  },
};

export function getLicenseEmailCopy(locale: AuthEmailLocale): LicenseEmailCopy {
  return LICENSE[locale] ?? LICENSE.en;
}

export function getSslEmailCopy(locale: AuthEmailLocale): GenericAddonEmailCopy {
  return SSL[locale] ?? SSL.en;
}

export function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || email.split("@")[0] || email;
}

export function resolveEmailLocaleFromUser(preferredCurrency?: string | null): AuthEmailLocale {
  if (preferredCurrency === "AZN") return "az";
  return "en";
}

export function formatEmailDate(date: Date, locale: AuthEmailLocale): string {
  const tag = locale === "az" ? "az-AZ" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : "en-US";
  return new Intl.DateTimeFormat(tag, { dateStyle: "long" }).format(date);
}
