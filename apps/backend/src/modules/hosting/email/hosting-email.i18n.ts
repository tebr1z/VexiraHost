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

const COPY: Record<AuthEmailLocale, HostingDeletedEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: "Hosting account removed",
    subtitle: (name, domain) =>
      `Hi ${name}, your hosting account for ${domain} has been permanently removed from Vexira Host.`,
    noticeTitle: "What this means",
    noticeBody:
      "The website, email, databases, and files linked to this account are no longer available on our platform. If this was unexpected, contact support right away.",
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
      "Bu hesaba bağlı web sitesi, e-posta, veritabanı ve dosyalar artık platformumuzda kullanılamaz. Bu işlemi siz istemediyseniz hemen destek ekibimize yazın.",
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
      "Сайт, почта, базы данных и файлы, связанные с этим аккаунтом, больше недоступны. Если удаление было неожиданным — сразу напишите в поддержку.",
    domainLabel: "Домен",
    planLabel: "План",
    serverLabel: "Сервер",
    usernameLabel: "Логин",
    deletedAtLabel: "Дата удаления",
    dashboardButton: "Открыть панель",
    supportButton: "Связаться с поддержкой",
    footer:
      "Это автоматическое уведомление. При необходимости откройте тикет в клиентской панели.",
    noServer: "—",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: "Hosting hesabınız silindi",
    subtitle: (name, domain) =>
      `Salam ${name}, ${domain} üçün hosting hesabınız Vexira Host-dan həmişəlik silindi.`,
    noticeTitle: "Bu nə deməkdir?",
    noticeBody:
      "Bu hesaba bağlı sayt, e-poçt, verilənlər bazası və fayllar artıq platformamızda əlçatan deyil. Bu gözlənilməz idisə, dərhal dəstək ilə əlaqə saxlayın.",
    domainLabel: "Domain",
    planLabel: "Plan",
    serverLabel: "Server",
    usernameLabel: "İstifadəçi adı",
    deletedAtLabel: "Silinmə tarixi",
    dashboardButton: "Müştəri panelinə keç",
    supportButton: "Dəstək ilə əlaqə",
    footer:
      "Bu avtomatik bildirişdir. Kömək lazımdırsa müştəri panelindən ticket aça bilərsiniz.",
    noServer: "—",
  },
};

export function getHostingDeletedEmailCopy(locale: AuthEmailLocale): HostingDeletedEmailCopy {
  return COPY[locale] ?? COPY.en;
}
