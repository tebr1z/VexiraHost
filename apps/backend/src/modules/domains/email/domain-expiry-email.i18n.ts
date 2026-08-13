import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export interface DomainExpiryEmailCopy {
  brandTagline: string;
  preTitle: (days: number) => string;
  preSubtitle: (name: string, domain: string, days: number) => string;
  preNoticeTitle: string;
  preNoticeBody: (days: number) => string;
  expiredTitle: string;
  expiredSubtitle: (name: string, domain: string) => string;
  expiredNoticeTitle: string;
  expiredNoticeBody: (daysLeft: number) => string;
  expiredDayTitle: (day: 7 | 10 | 15) => string;
  expiredDayBody: (day: 7 | 10 | 15, daysLeft: number) => string;
  deletedTitle: string;
  deletedSubtitle: (name: string, domain: string) => string;
  deletedNoticeTitle: string;
  deletedNoticeBody: string;
  domainLabel: string;
  expiresLabel: string;
  expiredLabel: string;
  remainingLabel: string;
  graceLabel: string;
  amountLabel: string;
  feeLabel: string;
  invoiceLabel: string;
  renewButton: string;
  dashboardButton: string;
  supportButton: string;
  footer: string;
}

const EN: DomainExpiryEmailCopy = {
  brandTagline: "Domain registration & DNS",
  preTitle: (days) =>
    days === 1 ? "Your domain expires tomorrow" : `Your domain expires in ${days} days`,
  preSubtitle: (name, domain, days) =>
    `Hi ${name}, ${domain} expires in ${days} day${days === 1 ? "" : "s"}. Renew it from your dashboard to keep the name.`,
  preNoticeTitle: "Renewal reminder",
  preNoticeBody: (days) =>
    days <= 3
      ? "Time is short. If the domain expires, a 1% processing fee is added and the name may be removed after 15 days."
      : "Renew before the expiry date to avoid interruption and a 1% processing fee after expiry.",
  expiredTitle: "Your domain has expired",
  expiredSubtitle: (name, domain) =>
    `Hi ${name}, ${domain} has expired. A 1% processing fee was added. You have 15 days to renew.`,
  expiredNoticeTitle: "Grace period started",
  expiredNoticeBody: (daysLeft) =>
    `The domain is suspended. Renew within ${daysLeft} day${daysLeft === 1 ? "" : "s"} or it will be permanently deleted.`,
  expiredDayTitle: (day) =>
    day === 15
      ? "Final notice — domain will be deleted today"
      : `Expired domain — day ${day} of 15`,
  expiredDayBody: (day, daysLeft) =>
    day === 15
      ? "This is the last day. If payment is not completed, the domain will be removed from Vexira Host."
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remain in the grace period. A 1% processing fee already applies.`,
  deletedTitle: "Domain removed",
  deletedSubtitle: (name, domain) =>
    `Hi ${name}, ${domain} was permanently removed after the 15-day grace period.`,
  deletedNoticeTitle: "What this means",
  deletedNoticeBody:
    "The domain is no longer on your account. DNS and related records were deleted. Contact support if this was unexpected.",
  domainLabel: "Domain",
  expiresLabel: "Expires",
  expiredLabel: "Expired on",
  remainingLabel: "Days remaining",
  graceLabel: "Grace ends",
  amountLabel: "Amount due",
  feeLabel: "Processing fee (1%)",
  invoiceLabel: "Invoice",
  renewButton: "Renew now",
  dashboardButton: "Open dashboard",
  supportButton: "Contact support",
  footer: "This is an automated Vexira Host domain notice.",
};

const AZ: DomainExpiryEmailCopy = {
  ...EN,
  brandTagline: "Domain qeydiyyatı və DNS",
  preTitle: (days) => (days === 1 ? "Domain sabah bitir" : `Domainin bitməsinə ${days} gün qalıb`),
  preSubtitle: (name, domain, days) =>
    `Salam ${name}, ${domain} domaininin bitməsinə ${days} gün qalıb. Adı saxlamaq üçün paneldən yeniləyin.`,
  preNoticeTitle: "Yeniləmə xatırlatması",
  preNoticeBody: (days) =>
    days <= 3
      ? "Vaxt azdır. Domain bitəndən sonra 1% əməliyyat haqqı əlavə olunur və 15 gündən sonra silinə bilər."
      : "Fasilə və bitmədən sonra 1% əməliyyat haqqı olmaması üçün bitmə tarixindən əvvəl yeniləyin.",
  expiredTitle: "Domainin müddəti bitib",
  expiredSubtitle: (name, domain) =>
    `Salam ${name}, ${domain} bitib. 1% əməliyyat haqqı əlavə olundu. Yeniləmək üçün 15 gününüz var.`,
  expiredNoticeTitle: "Güzəşt müddəti başladı",
  expiredNoticeBody: (daysLeft) =>
    `Domain dayandırılıb. ${daysLeft} gün ərzində yeniləməsəniz, sistemdən silinəcək.`,
  expiredDayTitle: (day) =>
    day === 15
      ? "Son xəbərdarlıq — domain bu gün silinəcək"
      : `Bitmiş domain — 15 gündən ${day}-ci gün`,
  expiredDayBody: (day, daysLeft) =>
    day === 15
      ? "Bu son gündür. Ödəniş tamamlanmasa, domain Vexira Host-dan silinəcək."
      : `Güzəşt müddətindən ${daysLeft} gün qalıb. 1% əməliyyat haqqı artıq tətbiq olunub.`,
  deletedTitle: "Domain silindi",
  deletedSubtitle: (name, domain) =>
    `Salam ${name}, ${domain} 15 günlük güzəşt müddətindən sonra həmişəlik silindi.`,
  deletedNoticeTitle: "Bu nə deməkdir?",
  deletedNoticeBody:
    "Domain artıq hesabınızda yoxdur. DNS və əlaqəli qeydlər silinib. Gözlənilməz idisə dəstəyə yazın.",
  domainLabel: "Domain",
  expiresLabel: "Bitmə tarixi",
  expiredLabel: "Bitdi",
  remainingLabel: "Qalan gün",
  graceLabel: "Güzəşt bitir",
  amountLabel: "Ödəniləcək",
  feeLabel: "Əməliyyat haqqı (1%)",
  invoiceLabel: "Faktura",
  renewButton: "İndi yenilə",
  dashboardButton: "Panelə keç",
  supportButton: "Dəstək",
  footer: "Bu avtomatik Vexira Host domain bildirişidir.",
};

const TR: DomainExpiryEmailCopy = {
  ...EN,
  brandTagline: "Alan adı kaydı ve DNS",
  preTitle: (days) =>
    days === 1 ? "Alan adınız yarın bitiyor" : `Alan adınızın bitmesine ${days} gün kaldı`,
  preSubtitle: (name, domain, days) =>
    `Merhaba ${name}, ${domain} alan adının bitmesine ${days} gün kaldı. Adı korumak için panelden yenileyin.`,
  preNoticeTitle: "Yenileme hatırlatması",
  preNoticeBody: (days) =>
    days <= 3
      ? "Süre az. Süre bitince %1 işlem ücreti eklenir ve 15 gün sonra silinebilir."
      : "Kesinti ve süre bitiminden sonra %1 işlem ücreti olmaması için bitiş tarihinden önce yenileyin.",
  expiredTitle: "Alan adınızın süresi doldu",
  expiredSubtitle: (name, domain) =>
    `Merhaba ${name}, ${domain} süresi doldu. %1 işlem ücreti eklendi. Yenilemek için 15 gününüz var.`,
  expiredNoticeTitle: "Ek süre başladı",
  expiredNoticeBody: (daysLeft) =>
    `Alan adı askıya alındı. ${daysLeft} gün içinde yenilemezseniz sistemden silinir.`,
  expiredDayTitle: (day) =>
    day === 15
      ? "Son uyarı — alan adı bugün silinecek"
      : `Süresi dolmuş alan adı — 15 günden ${day}. gün`,
  expiredDayBody: (day, daysLeft) =>
    day === 15
      ? "Bu son gündür. Ödeme tamamlanmazsa alan adı Vexira Host’tan silinir."
      : `Ek süreden ${daysLeft} gün kaldı. %1 işlem ücreti zaten uygulandı.`,
  deletedTitle: "Alan adı silindi",
  deletedSubtitle: (name, domain) =>
    `Merhaba ${name}, ${domain} 15 günlük ek sürenin ardından kalıcı olarak silindi.`,
  deletedNoticeTitle: "Bu ne anlama geliyor?",
  deletedNoticeBody:
    "Alan adı artık hesabınızda yok. DNS ve ilgili kayıtlar silindi. Beklenmedikse destek ile iletişime geçin.",
  domainLabel: "Alan adı",
  expiresLabel: "Bitiş",
  expiredLabel: "Sona erdi",
  remainingLabel: "Kalan gün",
  graceLabel: "Ek süre bitişi",
  amountLabel: "Ödenecek tutar",
  feeLabel: "İşlem ücreti (%1)",
  invoiceLabel: "Fatura",
  renewButton: "Şimdi yenile",
  dashboardButton: "Panele git",
  supportButton: "Destek",
  footer: "Bu otomatik bir Vexira Host alan adı bildirimidir.",
};

const RU: DomainExpiryEmailCopy = {
  ...EN,
  brandTagline: "Регистрация доменов и DNS",
  preTitle: (days) =>
    days === 1 ? "Домен истекает завтра" : `До истечения домена осталось ${days} дн.`,
  preSubtitle: (name, domain, days) =>
    `Здравствуйте, ${name}! До истечения ${domain} осталось ${days} дн. Продлите домен в панели, чтобы сохранить имя.`,
  preNoticeTitle: "Напоминание о продлении",
  preNoticeBody: (days) =>
    days <= 3
      ? "Времени мало. После истечения добавляется комиссия 1%, и через 15 дней домен может быть удалён."
      : "Продлите до истечения срока, чтобы избежать простоя и комиссии 1%.",
  expiredTitle: "Срок домена истёк",
  expiredSubtitle: (name, domain) =>
    `Здравствуйте, ${name}! Срок ${domain} истёк. Добавлена комиссия 1%. На продление есть 15 дней.`,
  expiredNoticeTitle: "Льготный период начался",
  expiredNoticeBody: (daysLeft) =>
    `Домен приостановлен. Продлите в течение ${daysLeft} дн., иначе он будет удалён.`,
  expiredDayTitle: (day) =>
    day === 15
      ? "Последнее предупреждение — домен будет удалён сегодня"
      : `Истёкший домен — день ${day} из 15`,
  expiredDayBody: (day, daysLeft) =>
    day === 15
      ? "Это последний день. Без оплаты домен будет удалён с Vexira Host."
      : `В льготном периоде осталось ${daysLeft} дн. Комиссия 1% уже применена.`,
  deletedTitle: "Домен удалён",
  deletedSubtitle: (name, domain) =>
    `Здравствуйте, ${name}! ${domain} был навсегда удалён после 15-дневного льготного периода.`,
  deletedNoticeTitle: "Что это значит",
  deletedNoticeBody:
    "Домена больше нет в аккаунте. DNS и связанные записи удалены. Если это неожиданно — напишите в поддержку.",
  domainLabel: "Домен",
  expiresLabel: "Истекает",
  expiredLabel: "Истёк",
  remainingLabel: "Осталось дней",
  graceLabel: "Конец льготного периода",
  amountLabel: "К оплате",
  feeLabel: "Комиссия (1%)",
  invoiceLabel: "Счёт",
  renewButton: "Продлить",
  dashboardButton: "Открыть панель",
  supportButton: "Поддержка",
  footer: "Это автоматическое уведомление Vexira Host о домене.",
};

const COPY: Record<AuthEmailLocale, DomainExpiryEmailCopy> = { en: EN, az: AZ, tr: TR, ru: RU };

export function getDomainExpiryEmailCopy(locale: AuthEmailLocale): DomainExpiryEmailCopy {
  return COPY[locale] ?? EN;
}
