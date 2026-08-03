import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export interface HostingDeletedEmailCopy {
  brandTagline: string;
  title: string;
  subtitle: (name: string, domain: string) => string;
  noticeTitle: string;
  noticeBody: string;
  domainLabel: string;
  planLabel: string;
  serverLabel: string;
  usernameLabel: string;
  deletedAtLabel: string;
  dashboardButton: string;
  supportButton: string;
  footer: string;
  noServer: string;
}

export interface HostingRenewalEmailCopy {
  brandTagline: string;
  title: string;
  subtitle: (name: string, domain: string) => string;
  noticeTitle: string;
  noticeBody: (days: number) => string;
  domainLabel: string;
  panelLabel: string;
  amountLabel: string;
  invoiceLabel: string;
  dueLabel: string;
  payButton: string;
  invoicesButton: string;
  footer: string;
}

const DELETED: Record<AuthEmailLocale, HostingDeletedEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: "Hosting account removed",
    subtitle: (name, domain) =>
      `Hi ${name}, your hosting account for ${domain} has been permanently removed from Vexira Host.`,
    noticeTitle: "What this means",
    noticeBody:
      "The website, email, databases, and files linked to this account are no longer available. Data may not be recoverable. If this was unexpected, contact support right away.",
    domainLabel: "Domain",
    planLabel: "Plan",
    serverLabel: "Server",
    usernameLabel: "Username",
    deletedAtLabel: "Removed on",
    dashboardButton: "Open customer panel",
    supportButton: "Contact support",
    footer:
      "This is an automated notification. You can open a ticket from your customer panel if you need help.",
    noServer: "—",
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    title: "Hosting hesabınız silindi",
    subtitle: (name, domain) =>
      `Merhaba ${name}, ${domain} için hosting hesabınız Vexira Host üzerinden kalıcı olarak kaldırıldı.`,
    noticeTitle: "Bu ne anlama geliyor?",
    noticeBody:
      "Bu hesaba bağlı site, e-posta, veritabanı ve dosyalar artık kullanılamaz. Veriler geri getirilemeyebilir. Bu işlemi siz istemediyseniz hemen destek ekibimize yazın.",
    domainLabel: "Domain",
    planLabel: "Plan",
    serverLabel: "Sunucu",
    usernameLabel: "Kullanıcı adı",
    deletedAtLabel: "Silinme tarihi",
    dashboardButton: "Müşteri paneline git",
    supportButton: "Destek ile iletişim",
    footer:
      "Bu otomatik bir bilgilendirme mesajıdır. Yardım için müşteri panelinden destek talebi açabilirsiniz.",
    noServer: "—",
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    title: "Хостинг-аккаунт удалён",
    subtitle: (name, domain) =>
      `Здравствуйте, ${name}! Хостинг-аккаунт для ${domain} был навсегда удалён с платформы Vexira Host.`,
    noticeTitle: "Что это значит",
    noticeBody:
      "Сайт, почта, базы данных и файлы больше недоступны. Данные могут быть невосстановимы. Если удаление было неожиданным — сразу напишите в поддержку.",
    domainLabel: "Домен",
    planLabel: "План",
    serverLabel: "Сервер",
    usernameLabel: "Логин",
    deletedAtLabel: "Дата удаления",
    dashboardButton: "Открыть панель",
    supportButton: "Связаться с поддержкой",
    footer: "Это автоматическое уведомление. При необходимости откройте тикет в клиентской панели.",
    noServer: "—",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: "Hosting hesabınız silindi",
    subtitle: (name, domain) =>
      `Salam ${name}, ${domain} üçün hosting hesabınız Vexira Host-dan həmişəlik silindi.`,
    noticeTitle: "Bu nə deməkdir?",
    noticeBody:
      "Bu hesaba bağlı sayt, e-poçt, verilənlər bazası və fayllar artıq əlçatan deyil. Məlumatlar geri qaytarılmaya bilər. Bu gözlənilməz idisə, dərhal dəstək ilə əlaqə saxlayın.",
    domainLabel: "Domain",
    planLabel: "Plan",
    serverLabel: "Server",
    usernameLabel: "İstifadəçi adı",
    deletedAtLabel: "Silinmə tarixi",
    dashboardButton: "Müştəri panelinə keç",
    supportButton: "Dəstək ilə əlaqə",
    footer: "Bu avtomatik bildirişdir. Kömək lazımdırsa müştəri panelindən ticket aça bilərsiniz.",
    noServer: "—",
  },
};

const RENEWAL: Record<AuthEmailLocale, HostingRenewalEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: "Service expired — invoice issued",
    subtitle: (name, domain) =>
      `Hi ${name}, your service for ${domain} has expired. A renewal invoice is ready.`,
    noticeTitle: "Payment required",
    noticeBody: (days) =>
      `Your service is suspended. Pay within ${days} days or the service will be permanently deleted and data may not be recoverable.`,
    domainLabel: "Service",
    panelLabel: "Panel",
    amountLabel: "Amount",
    invoiceLabel: "Invoice",
    dueLabel: "Pay by",
    payButton: "Pay invoice",
    invoicesButton: "My invoices",
    footer: "This is an automated billing notice from Vexira Host.",
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    title: "Hizmet süresi doldu — fatura oluşturuldu",
    subtitle: (name, domain) =>
      `Merhaba ${name}, ${domain} hizmetinizin süresi doldu. Yenileme faturası hazır.`,
    noticeTitle: "Ödeme gerekli",
    noticeBody: (days) =>
      `Hizmetiniz askıya alındı. ${days} gün içinde ödeme yapmazsanız hizmet kalıcı olarak silinir ve veriler geri getirilemeyebilir.`,
    domainLabel: "Hizmet",
    panelLabel: "Panel",
    amountLabel: "Tutar",
    invoiceLabel: "Fatura",
    dueLabel: "Son ödeme",
    payButton: "Faturayı öde",
    invoicesButton: "Faturalarım",
    footer: "Bu Vexira Host otomatik faturalama bildirişidir.",
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    title: "Срок услуги истёк — выставлен счёт",
    subtitle: (name, domain) =>
      `Здравствуйте, ${name}! Срок услуги ${domain} истёк. Счёт на продление готов.`,
    noticeTitle: "Требуется оплата",
    noticeBody: (days) =>
      `Услуга приостановлена. Оплатите в течение ${days} дней, иначе услуга будет удалена и данные могут быть невосстановимы.`,
    domainLabel: "Услуга",
    panelLabel: "Панель",
    amountLabel: "Сумма",
    invoiceLabel: "Счёт",
    dueLabel: "Оплатить до",
    payButton: "Оплатить счёт",
    invoicesButton: "Мои счета",
    footer: "Автоматическое уведомление Vexira Host.",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: "Xidmətin müddəti bitdi — faktura yaradıldı",
    subtitle: (name, domain) =>
      `Salam ${name}, ${domain} xidmətinizin müddəti bitdi. Yeniləmə fakturası hazırdır.`,
    noticeTitle: "Ödəniş tələb olunur",
    noticeBody: (days) =>
      `Xidmətiniz askıdadır. ${days} gün ərzində ödəniş edilməsə xidmət sistemdən silinəcək və məlumatlar geri qaytarılmaya bilər.`,
    domainLabel: "Xidmət",
    panelLabel: "Panel",
    amountLabel: "Məbləğ",
    invoiceLabel: "Faktura",
    dueLabel: "Son ödəniş",
    payButton: "Fakturanı ödə",
    invoicesButton: "Fakturalarım",
    footer: "Bu Vexira Host avtomatik billing bildirişidir.",
  },
};

export function getHostingDeletedEmailCopy(locale: AuthEmailLocale): HostingDeletedEmailCopy {
  return DELETED[locale] ?? DELETED.en;
}

export function getHostingRenewalEmailCopy(locale: AuthEmailLocale): HostingRenewalEmailCopy {
  return RENEWAL[locale] ?? RENEWAL.en;
}
