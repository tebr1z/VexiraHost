import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

type BalanceCreditCopy = {
  brandTagline: string;
  title: string;
  subtitle: (name: string, amount: string) => string;
  noticeTitle: string;
  noticeBody: string;
  amountLabel: string;
  balanceLabel: string;
  referenceLabel: string;
  noteLabel: string;
  dashboardButton: string;
  footer: string;
  notificationTitle: string;
  notificationBody: (amount: string, reference: string) => string;
};

const COPIES: Record<AuthEmailLocale, BalanceCreditCopy> = {
  en: {
    brandTagline: "Cloud hosting & domains",
    title: "Balance credited",
    subtitle: (name, amount) => `Hi ${name}, ${amount} was added to your account balance.`,
    noticeTitle: "Prepaid credit",
    noticeBody: "You can use this balance to pay open invoices from your client dashboard.",
    amountLabel: "Amount added",
    balanceLabel: "New balance",
    referenceLabel: "Reference",
    noteLabel: "Note",
    dashboardButton: "Open dashboard",
    footer: "If you did not expect this credit, contact support.",
    notificationTitle: "Balance credited",
    notificationBody: (amount, reference) => `${amount} added to your balance. Ref: ${reference}`,
  },
  tr: {
    brandTagline: "Bulut hosting ve alan adları",
    title: "Bakiyenize yükleme yapıldı",
    subtitle: (name, amount) => `Merhaba ${name}, hesabınıza ${amount} eklendi.`,
    noticeTitle: "Ön ödemeli bakiye",
    noticeBody: "Bu bakiyeyi müşteri panelinden açık faturaları ödemek için kullanabilirsiniz.",
    amountLabel: "Eklenen tutar",
    balanceLabel: "Yeni bakiye",
    referenceLabel: "Referans",
    noteLabel: "Not",
    dashboardButton: "Panele git",
    footer: "Bu yüklemeyi beklemiyorsanız destek ile iletişime geçin.",
    notificationTitle: "Bakiye yüklendi",
    notificationBody: (amount, reference) => `Bakiyenize ${amount} eklendi. Ref: ${reference}`,
  },
  ru: {
    brandTagline: "Облачный хостинг и домены",
    title: "Баланс пополнен",
    subtitle: (name, amount) => `Здравствуйте, ${name}! На ваш баланс зачислено ${amount}.`,
    noticeTitle: "Предоплаченный баланс",
    noticeBody: "Этим балансом можно оплачивать открытые счета в панели клиента.",
    amountLabel: "Зачислено",
    balanceLabel: "Новый баланс",
    referenceLabel: "Номер операции",
    noteLabel: "Примечание",
    dashboardButton: "Открыть панель",
    footer: "Если вы не ожидали это зачисление, свяжитесь с поддержкой.",
    notificationTitle: "Баланс пополнен",
    notificationBody: (amount, reference) => `На баланс зачислено ${amount}. № ${reference}`,
  },
  az: {
    brandTagline: "Bulud hosting və domenlər",
    title: "Balansınıza vəsait əlavə olundu",
    subtitle: (name, amount) => `Salam ${name}, hesabınıza ${amount} əlavə edildi.`,
    noticeTitle: "Ödəniş balansı",
    noticeBody: "Bu balansdan müştəri panelində açıq fakturaları ödəyə bilərsiniz.",
    amountLabel: "Əlavə olunan məbləğ",
    balanceLabel: "Yeni balans",
    referenceLabel: "Əməliyyat nömrəsi",
    noteLabel: "Qeyd",
    dashboardButton: "Panelə keç",
    footer: "Bu əməliyyatı gözləmirdinizsə, dəstək ilə əlaqə saxlayın.",
    notificationTitle: "Balansa vəsait əlavə olundu",
    notificationBody: (amount, reference) => `Balansınıza ${amount} əlavə olundu. № ${reference}`,
  },
};

export function getBalanceCreditCopy(locale: AuthEmailLocale): BalanceCreditCopy {
  return COPIES[locale] ?? COPIES.en;
}

type BalancePaymentCopy = {
  notificationTitle: string;
  notificationBody: (amount: string, invoiceNumber: string) => string;
};

const PAYMENT_COPIES: Record<AuthEmailLocale, BalancePaymentCopy> = {
  en: {
    notificationTitle: "Paid with balance",
    notificationBody: (amount, invoiceNumber) =>
      `${amount} paid from balance for invoice ${invoiceNumber}.`,
  },
  tr: {
    notificationTitle: "Bakiye ile ödendi",
    notificationBody: (amount, invoiceNumber) =>
      `${invoiceNumber} faturası için bakiyeden ${amount} ödendi.`,
  },
  ru: {
    notificationTitle: "Оплата с баланса",
    notificationBody: (amount, invoiceNumber) =>
      `С баланса списано ${amount} по счёту ${invoiceNumber}.`,
  },
  az: {
    notificationTitle: "Balansla ödənildi",
    notificationBody: (amount, invoiceNumber) =>
      `${invoiceNumber} fakturası üçün balansdan ${amount} ödənildi.`,
  },
};

export function getBalancePaymentCopy(locale: AuthEmailLocale): BalancePaymentCopy {
  return PAYMENT_COPIES[locale] ?? PAYMENT_COPIES.en;
}
