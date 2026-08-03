import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export type AssignmentEmailKind = "domain" | "hosting" | "server";

export interface AssignmentEmailCopy {
  brandTagline: string;
  title: (kind: AssignmentEmailKind) => string;
  subtitle: (name: string, label: string) => string;
  noticeTitle: string;
  noticeBody: string;
  serviceLabel: string;
  typeLabel: string;
  typeValue: (kind: AssignmentEmailKind) => string;
  panelLabel: string;
  expiresLabel: string;
  dashboardButton: string;
  footer: string;
}

const COPY: Record<AuthEmailLocale, AssignmentEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    title: (kind) =>
      kind === "domain"
        ? "A domain was assigned to you"
        : kind === "server"
          ? "A server was assigned to you"
          : "A service was assigned to you",
    subtitle: (name, label) => `Hi ${name}, ${label} is now available in your client panel.`,
    noticeTitle: "Ready to use",
    noticeBody: "Sign in to your dashboard to view details and manage this service.",
    serviceLabel: "Service",
    typeLabel: "Type",
    typeValue: (kind) => (kind === "domain" ? "Domain" : kind === "server" ? "Server" : "Hosting"),
    panelLabel: "Panel",
    expiresLabel: "Expires",
    dashboardButton: "Open dashboard",
    footer: "This is an automated notice from Vexira Host.",
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    title: (kind) =>
      kind === "domain"
        ? "Size bir domain atandı"
        : kind === "server"
          ? "Size bir sunucu atandı"
          : "Size bir hizmet atandı",
    subtitle: (name, label) => `Merhaba ${name}, ${label} artık müşteri panelinizde hazır.`,
    noticeTitle: "Kullanıma hazır",
    noticeBody: "Detayları görmek ve yönetmek için paneline giriş yapın.",
    serviceLabel: "Hizmet",
    typeLabel: "Tür",
    typeValue: (kind) => (kind === "domain" ? "Domain" : kind === "server" ? "Sunucu" : "Hosting"),
    panelLabel: "Panel",
    expiresLabel: "Bitiş",
    dashboardButton: "Panele git",
    footer: "Bu Vexira Host otomatik bildirişidir.",
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    title: (kind) =>
      kind === "domain"
        ? "Вам назначен домен"
        : kind === "server"
          ? "Вам назначен сервер"
          : "Вам назначена услуга",
    subtitle: (name, label) => `Здравствуйте, ${name}! ${label} уже доступен в вашей панели.`,
    noticeTitle: "Готово к использованию",
    noticeBody: "Войдите в панель, чтобы посмотреть детали и управлять услугой.",
    serviceLabel: "Услуга",
    typeLabel: "Тип",
    typeValue: (kind) => (kind === "domain" ? "Домен" : kind === "server" ? "Сервер" : "Хостинг"),
    panelLabel: "Панель",
    expiresLabel: "Истекает",
    dashboardButton: "Открыть панель",
    footer: "Автоматическое уведомление Vexira Host.",
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    title: (kind) =>
      kind === "domain"
        ? "Sizə domain təyin edildi"
        : kind === "server"
          ? "Sizə server təyin edildi"
          : "Sizə xidmət təyin edildi",
    subtitle: (name, label) => `Salam ${name}, ${label} artıq müştəri panelinizdə hazırdır.`,
    noticeTitle: "İstifadəyə hazırdır",
    noticeBody: "Təfərrüatlara baxmaq və idarə etmək üçün panelə daxil olun.",
    serviceLabel: "Xidmət",
    typeLabel: "Tip",
    typeValue: (kind) => (kind === "domain" ? "Domain" : kind === "server" ? "Server" : "Hosting"),
    panelLabel: "Panel",
    expiresLabel: "Bitmə",
    dashboardButton: "Panelə keç",
    footer: "Bu Vexira Host avtomatik bildirişidir.",
  },
};

export function getAssignmentEmailCopy(locale: AuthEmailLocale): AssignmentEmailCopy {
  return COPY[locale] ?? COPY.en;
}
