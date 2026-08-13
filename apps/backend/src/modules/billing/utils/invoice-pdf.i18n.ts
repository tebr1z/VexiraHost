import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export type InvoicePdfLocale = AuthEmailLocale;

export interface InvoicePdfCopy {
  documentTitle: string;
  invoice: string;
  from: string;
  billTo: string;
  companyLegal: string;
  companyLine: string;
  issued: string;
  dueDate: string;
  paidOn: string;
  currency: string;
  description: string;
  qty: string;
  unit: string;
  amount: string;
  subtotal: string;
  amountPaid: string;
  amountDue: string;
  paymentNotes: string;
  paymentHint: string;
  support: string;
  thanks: string;
  officialFooter: string;
  generated: string;
  stampBrand: string;
  stampOfficial: string;
  stampPaid: string;
  moreItems: (count: number) => string;
  status: Record<string, string>;
}

const EN: InvoicePdfCopy = {
  documentTitle: "TAX INVOICE",
  invoice: "Invoice",
  from: "From",
  billTo: "Bill to",
  companyLegal: "Vexira Labs LLC",
  companyLine: "Enterprise hosting · VPS · Cloud",
  issued: "Issued",
  dueDate: "Due date",
  paidOn: "Paid on",
  currency: "Currency",
  description: "Description",
  qty: "Qty",
  unit: "Unit",
  amount: "Amount",
  subtotal: "Subtotal",
  amountPaid: "Amount paid",
  amountDue: "Amount due",
  paymentNotes: "Payment",
  paymentHint: "Pay securely from your Vexira Host dashboard.",
  support: "Billing support: billing@vexirahost.com",
  thanks: "Thank you for choosing Vexira Host",
  officialFooter: "Official invoice · Vexira Labs LLC · vexirahost.com",
  generated: "Generated",
  stampBrand: "VEXIRA HOST",
  stampOfficial: "OFFICIAL",
  stampPaid: "PAID",
  moreItems: (count) => `+ ${count} more item(s) in the customer dashboard`,
  status: {
    OPEN: "Open",
    PAID: "Paid",
    OVERDUE: "Overdue",
    VOID: "Void",
    DRAFT: "Draft",
  },
};

const AZ: InvoicePdfCopy = {
  ...EN,
  documentTitle: "RƏSMİ QƏBZ",
  invoice: "Faktura",
  from: "Göndərən",
  billTo: "Alıcı",
  companyLine: "Hosting · VPS · Bulud xidmətləri",
  issued: "Tarix",
  dueDate: "Son ödəniş",
  paidOn: "Ödənilmə",
  currency: "Valyuta",
  description: "Təsvir",
  qty: "Say",
  unit: "Qiymət",
  amount: "Məbləğ",
  subtotal: "Cəmi",
  amountPaid: "Ödənilən",
  amountDue: "Qalıq",
  paymentNotes: "Ödəniş",
  paymentHint: "Ödənişi Vexira Host panelindən təhlükəsiz edin.",
  support: "Dəstək: billing@vexirahost.com",
  thanks: "Vexira Host-u seçdiyiniz üçün təşəkkür edirik",
  officialFooter: "Rəsmi faktura · Vexira Labs LLC · vexirahost.com",
  generated: "Yaradılıb",
  stampOfficial: "RƏSMİ",
  stampPaid: "ÖDƏNİLDİ",
  moreItems: (count) => `+ daha ${count} sətir müştəri panelindədir`,
  status: {
    OPEN: "Açıq",
    PAID: "Ödənilib",
    OVERDUE: "Gecikib",
    VOID: "Ləğv",
    DRAFT: "Qaralama",
  },
};

const TR: InvoicePdfCopy = {
  ...EN,
  documentTitle: "FATURA",
  invoice: "Fatura",
  from: "Gönderen",
  billTo: "Alıcı",
  companyLine: "Hosting · VPS · Bulut hizmetleri",
  issued: "Düzenleme",
  dueDate: "Son ödeme",
  paidOn: "Ödenme",
  currency: "Para birimi",
  description: "Açıklama",
  qty: "Adet",
  unit: "Birim",
  amount: "Tutar",
  subtotal: "Ara toplam",
  amountPaid: "Ödenen",
  amountDue: "Kalan",
  paymentNotes: "Ödeme",
  paymentHint: "Ödemeyi Vexira Host panelinden güvenle yapın.",
  support: "Destek: billing@vexirahost.com",
  thanks: "Vexira Host’u tercih ettiğiniz için teşekkürler",
  officialFooter: "Resmi fatura · Vexira Labs LLC · vexirahost.com",
  generated: "Oluşturulma",
  stampOfficial: "RESMİ",
  stampPaid: "ÖDENDİ",
  moreItems: (count) => `+ ${count} kalem müşteri panelinde`,
  status: {
    OPEN: "Açık",
    PAID: "Ödendi",
    OVERDUE: "Gecikmiş",
    VOID: "İptal",
    DRAFT: "Taslak",
  },
};

const RU: InvoicePdfCopy = {
  ...EN,
  documentTitle: "СЧЁТ",
  invoice: "Счёт",
  from: "Исполнитель",
  billTo: "Плательщик",
  companyLine: "Хостинг · VPS · Облачные услуги",
  issued: "Выставлен",
  dueDate: "Оплатить до",
  paidOn: "Оплачен",
  currency: "Валюта",
  description: "Описание",
  qty: "Кол.",
  unit: "Цена",
  amount: "Сумма",
  subtotal: "Итого",
  amountPaid: "Оплачено",
  amountDue: "К оплате",
  paymentNotes: "Оплата",
  paymentHint: "Оплатите счёт в панели Vexira Host.",
  support: "Поддержка: billing@vexirahost.com",
  thanks: "Спасибо, что выбрали Vexira Host",
  officialFooter: "Официальный счёт · Vexira Labs LLC · vexirahost.com",
  generated: "Сформирован",
  stampOfficial: "ПЕЧАТЬ",
  stampPaid: "ОПЛАЧЕН",
  moreItems: (count) => `+ ещё ${count} поз. в панели клиента`,
  status: {
    OPEN: "Открыт",
    PAID: "Оплачен",
    OVERDUE: "Просрочен",
    VOID: "Аннулирован",
    DRAFT: "Черновик",
  },
};

const COPY: Record<InvoicePdfLocale, InvoicePdfCopy> = { en: EN, az: AZ, tr: TR, ru: RU };

export function getInvoicePdfCopy(locale: InvoicePdfLocale): InvoicePdfCopy {
  return COPY[locale] ?? EN;
}

export function intlLocale(locale: InvoicePdfLocale): string {
  if (locale === "az") return "az-AZ";
  if (locale === "tr") return "tr-TR";
  if (locale === "ru") return "ru-RU";
  return "en-GB";
}
