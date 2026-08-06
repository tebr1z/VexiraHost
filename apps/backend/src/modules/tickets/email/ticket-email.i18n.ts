import type { TicketStatus } from "@prisma/client";

import type { AuthEmailLocale } from "@/modules/auth/email/auth-email.locale";

export interface TicketEmailCopy {
  brandTagline: string;
  statusLabel: (status: TicketStatus) => string;
  created: {
    title: string;
    subtitle: (name: string, subject: string) => string;
    noticeTitle: string;
    noticeBody: string;
    subjectLabel: string;
    statusLabel: string;
    priorityLabel: string;
    ticketIdLabel: string;
    messageLabel: string;
    openButton: string;
    footer: string;
  };
  reply: {
    title: string;
    subtitle: (name: string, subject: string) => string;
    noticeTitle: string;
    noticeBody: string;
    subjectLabel: string;
    statusLabel: string;
    messageLabel: string;
    openButton: string;
    footer: string;
  };
  statusChanged: {
    title: string;
    subtitle: (name: string, subject: string) => string;
    noticeTitle: string;
    noticeBody: (from: string, to: string) => string;
    subjectLabel: string;
    previousLabel: string;
    newLabel: string;
    openButton: string;
    footer: string;
  };
  autoClosed: {
    title: string;
    subtitle: (name: string, subject: string) => string;
    noticeTitle: string;
    noticeBody: string;
    subjectLabel: string;
    statusLabel: string;
    openButton: string;
    footer: string;
  };
}

const STATUS_EN: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_CUSTOMER: "Waiting for your reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_TR: Record<TicketStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşleniyor",
  WAITING_CUSTOMER: "Yanıtınız bekleniyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapalı",
};

const STATUS_RU: Record<TicketStatus, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  WAITING_CUSTOMER: "Ожидает вашего ответа",
  RESOLVED: "Решён",
  CLOSED: "Закрыт",
};

const STATUS_AZ: Record<TicketStatus, string> = {
  OPEN: "Açıq",
  IN_PROGRESS: "İşlənir",
  WAITING_CUSTOMER: "Cavabınız gözlənilir",
  RESOLVED: "Həll olundu",
  CLOSED: "Bağlı",
};

const COPY: Record<AuthEmailLocale, TicketEmailCopy> = {
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    statusLabel: (s) => STATUS_EN[s] ?? s,
    created: {
      title: "Support ticket created",
      subtitle: (name, subject) =>
        `Hi ${name}, we received your ticket “${subject}”. Our team will review it shortly.`,
      noticeTitle: "What happens next?",
      noticeBody:
        "You will get an email when our support team replies or when the ticket status changes.",
      subjectLabel: "Subject",
      statusLabel: "Status",
      priorityLabel: "Priority",
      ticketIdLabel: "Ticket ID",
      messageLabel: "Your message",
      openButton: "View ticket",
      footer: "You can reply anytime from your customer panel.",
    },
    reply: {
      title: "New reply on your ticket",
      subtitle: (name, subject) => `Hi ${name}, support replied to your ticket “${subject}”.`,
      noticeTitle: "Support response",
      noticeBody: "Please review the message below and reply if you still need help.",
      subjectLabel: "Subject",
      statusLabel: "Status",
      messageLabel: "Latest reply",
      openButton: "Open ticket & reply",
      footer: "Replying from your panel keeps the full conversation history in one place.",
    },
    statusChanged: {
      title: "Ticket status updated",
      subtitle: (name, subject) =>
        `Hi ${name}, the status of your ticket “${subject}” has changed.`,
      noticeTitle: "Status change",
      noticeBody: (from, to) => `Status moved from ${from} to ${to}.`,
      subjectLabel: "Subject",
      previousLabel: "Previous status",
      newLabel: "New status",
      openButton: "View ticket",
      footer: "If you have more questions, open the ticket and send a reply.",
    },
    autoClosed: {
      title: "Ticket closed automatically",
      subtitle: (name, subject) =>
        `Hi ${name}, your ticket “${subject}” was closed because we did not receive a reply within 12 hours.`,
      noticeTitle: "No customer reply",
      noticeBody:
        "Our last support message went unanswered for 12 hours, so this ticket was closed automatically. You can open a new ticket anytime if you still need help.",
      subjectLabel: "Subject",
      statusLabel: "Status",
      openButton: "View ticket",
      footer: "Need more help? Create a new support ticket from your customer panel.",
    },
  },
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    statusLabel: (s) => STATUS_TR[s] ?? s,
    created: {
      title: "Destek talebi oluşturuldu",
      subtitle: (name, subject) =>
        `Merhaba ${name}, “${subject}” konulu talebinizi aldık. Ekibimiz en kısa sürede inceleyecek.`,
      noticeTitle: "Sırada ne var?",
      noticeBody:
        "Destek ekibimiz yanıt verdiğinde veya talep durumu değiştiğinde size e-posta göndereceğiz.",
      subjectLabel: "Konu",
      statusLabel: "Durum",
      priorityLabel: "Öncelik",
      ticketIdLabel: "Talep no",
      messageLabel: "Mesajınız",
      openButton: "Talebi görüntüle",
      footer: "Yanıtınızı müşteri panelinden istediğiniz zaman gönderebilirsiniz.",
    },
    reply: {
      title: "Talebinize yeni yanıt",
      subtitle: (name, subject) =>
        `Merhaba ${name}, destek ekibi “${subject}” talebinize yanıt verdi.`,
      noticeTitle: "Destek yanıtı",
      noticeBody: "Aşağıdaki mesajı inceleyin; yardıma ihtiyacınız varsa yanıtlayın.",
      subjectLabel: "Konu",
      statusLabel: "Durum",
      messageLabel: "Son yanıt",
      openButton: "Talebi aç ve yanıtla",
      footer: "Panel üzerinden yanıtlamak tüm konuşma geçmişini tek yerde tutar.",
    },
    statusChanged: {
      title: "Talep durumu güncellendi",
      subtitle: (name, subject) => `Merhaba ${name}, “${subject}” talebinizin durumu değişti.`,
      noticeTitle: "Durum değişikliği",
      noticeBody: (from, to) => `Durum ${from} → ${to} olarak güncellendi.`,
      subjectLabel: "Konu",
      previousLabel: "Önceki durum",
      newLabel: "Yeni durum",
      openButton: "Talebi görüntüle",
      footer: "Başka sorunuz varsa talebi açıp yanıt gönderebilirsiniz.",
    },
    autoClosed: {
      title: "Talep otomatik kapatıldı",
      subtitle: (name, subject) =>
        `Merhaba ${name}, “${subject}” talebiniz 12 saat içinde yanıt gelmediği için otomatik kapatıldı.`,
      noticeTitle: "Müşteri yanıtı gelmedi",
      noticeBody:
        "Son destek mesajımıza 12 saat boyunca yanıt gelmediği için talep otomatik kapatıldı. Hâlâ yardıma ihtiyacınız varsa yeni bir talep açabilirsiniz.",
      subjectLabel: "Konu",
      statusLabel: "Durum",
      openButton: "Talebi görüntüle",
      footer: "Yeni destek talebini müşteri panelinden oluşturabilirsiniz.",
    },
  },
  ru: {
    brandTagline: "Безопасная облачная платформа",
    statusLabel: (s) => STATUS_RU[s] ?? s,
    created: {
      title: "Тикет создан",
      subtitle: (name, subject) =>
        `Здравствуйте, ${name}! Мы получили ваш тикет «${subject}». Команда скоро его рассмотрит.`,
      noticeTitle: "Что дальше?",
      noticeBody: "Мы пришлём письмо, когда поддержка ответит или изменится статус тикета.",
      subjectLabel: "Тема",
      statusLabel: "Статус",
      priorityLabel: "Приоритет",
      ticketIdLabel: "ID тикета",
      messageLabel: "Ваше сообщение",
      openButton: "Открыть тикет",
      footer: "Ответить можно в любое время из клиентской панели.",
    },
    reply: {
      title: "Новый ответ по тикету",
      subtitle: (name, subject) =>
        `Здравствуйте, ${name}! Поддержка ответила на тикет «${subject}».`,
      noticeTitle: "Ответ поддержки",
      noticeBody: "Просмотрите сообщение ниже и ответьте, если нужна дополнительная помощь.",
      subjectLabel: "Тема",
      statusLabel: "Статус",
      messageLabel: "Последний ответ",
      openButton: "Открыть тикет и ответить",
      footer: "Ответ через панель сохраняет всю переписку в одном месте.",
    },
    statusChanged: {
      title: "Статус тикета обновлён",
      subtitle: (name, subject) => `Здравствуйте, ${name}! Статус тикета «${subject}» изменился.`,
      noticeTitle: "Изменение статуса",
      noticeBody: (from, to) => `Статус изменён: ${from} → ${to}.`,
      subjectLabel: "Тема",
      previousLabel: "Было",
      newLabel: "Стало",
      openButton: "Открыть тикет",
      footer: "Если остались вопросы — откройте тикет и напишите ответ.",
    },
    autoClosed: {
      title: "Тикет закрыт автоматически",
      subtitle: (name, subject) =>
        `Здравствуйте, ${name}! Тикет «${subject}» закрыт автоматически, так как мы не получили ответа в течение 12 часов.`,
      noticeTitle: "Нет ответа клиента",
      noticeBody:
        "На последнее сообщение поддержки не было ответа 12 часов, поэтому тикет закрыт автоматически. Если помощь всё ещё нужна — создайте новый тикет.",
      subjectLabel: "Тема",
      statusLabel: "Статус",
      openButton: "Открыть тикет",
      footer: "Новый тикет можно создать в клиентской панели.",
    },
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hosting Platforması",
    statusLabel: (s) => STATUS_AZ[s] ?? s,
    created: {
      title: "Dəstək bileti yaradıldı",
      subtitle: (name, subject) =>
        `Salam ${name}, “${subject}” mövzulu biletinizi aldıq. Komandamız tezliklə baxacaq.`,
      noticeTitle: "Növbəti addım?",
      noticeBody: "Dəstək cavab verdikdə və ya bilet statusu dəyişdikdə sizə e-poçt göndərəcəyik.",
      subjectLabel: "Mövzu",
      statusLabel: "Status",
      priorityLabel: "Prioritet",
      ticketIdLabel: "Bilet ID",
      messageLabel: "Mesajınız",
      openButton: "Biletə bax",
      footer: "Cavabı istənilən vaxt müştəri panelindən göndərə bilərsiniz.",
    },
    reply: {
      title: "Biletinizə yeni cavab",
      subtitle: (name, subject) => `Salam ${name}, dəstək “${subject}” biletinizə cavab verdi.`,
      noticeTitle: "Dəstək cavabı",
      noticeBody: "Aşağıdakı mesaja baxın; hələ kömək lazımdırsa cavab yazın.",
      subjectLabel: "Mövzu",
      statusLabel: "Status",
      messageLabel: "Son cavab",
      openButton: "Bileti aç və cavabla",
      footer: "Paneldən cavab vermək bütün yazışmanı bir yerdə saxlayır.",
    },
    statusChanged: {
      title: "Bilet statusu yeniləndi",
      subtitle: (name, subject) => `Salam ${name}, “${subject}” biletinizin statusu dəyişdi.`,
      noticeTitle: "Status dəyişikliyi",
      noticeBody: (from, to) => `Status ${from} → ${to} olaraq yeniləndi.`,
      subjectLabel: "Mövzu",
      previousLabel: "Əvvəlki status",
      newLabel: "Yeni status",
      openButton: "Biletə bax",
      footer: "Əlavə sualınız varsa bileti açıb cavab göndərin.",
    },
    autoClosed: {
      title: "Bilet avtomatik bağlandı",
      subtitle: (name, subject) =>
        `Salam ${name}, “${subject}” biletiniz 12 saat ərzində cavab gəlmədiyi üçün avtomatik bağlandı.`,
      noticeTitle: "Müştəri cavabı gəlmədi",
      noticeBody:
        "Son dəstək mesajımıza 12 saat ərzində cavab gəlmədiyi üçün bilet avtomatik bağlandı. Hələ kömək lazımdırsa yeni bilet aça bilərsiniz.",
      subjectLabel: "Mövzu",
      statusLabel: "Status",
      openButton: "Biletə bax",
      footer: "Yeni dəstək biletini müştəri panelindən yarada bilərsiniz.",
    },
  },
};

export function getTicketEmailCopy(locale: AuthEmailLocale): TicketEmailCopy {
  return COPY[locale] ?? COPY.en;
}

export function truncateMessage(body: string, max = 500): string {
  const cleaned = body.trim().replace(/\s+/g, " ");
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}
