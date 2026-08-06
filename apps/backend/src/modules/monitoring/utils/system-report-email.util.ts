import type { HealthState, SystemHealthItem, SystemHealthSnapshot } from "../system-report.types";

import {
  createBrandEmail,
  escapeHtml,
  infoRow,
  infoTable,
} from "@/shared/email/transactional-template.util";

const STATE_LABELS: Record<HealthState, string> = {
  ok: "Çalışıyor",
  warning: "Uyarı",
  down: "Durdu",
  disabled: "Devre dışı",
};

const STATE_COLORS: Record<HealthState, string> = {
  ok: "#15803d",
  warning: "#b45309",
  down: "#b91c1c",
  disabled: "#64748b",
};

export function healthStateLabel(state: HealthState): string {
  return STATE_LABELS[state];
}

export function resolveOverallHealth(items: SystemHealthItem[]): SystemHealthSnapshot["overall"] {
  if (items.some((item) => item.state === "down")) return "critical";
  if (items.some((item) => item.state === "warning")) return "degraded";
  return "healthy";
}

function statusRow(item: SystemHealthItem): string {
  const color = STATE_COLORS[item.state];
  const label = escapeHtml(healthStateLabel(item.state));
  const name = escapeHtml(item.label);
  const message = escapeHtml(item.message);
  return `<tr>
    <td style="padding:10px 0;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e6eaf2;">${name}</td>
    <td style="padding:10px 0;font-size:13px;font-weight:700;color:${color};border-bottom:1px solid #e6eaf2;">${label}</td>
    <td style="padding:10px 0;font-size:13px;color:#475569;border-bottom:1px solid #e6eaf2;">${message}</td>
  </tr>`;
}

function overallSummary(snapshot: SystemHealthSnapshot): {
  title: string;
  tone: "info" | "warning" | "danger";
} {
  const down = snapshot.items.filter((item) => item.state === "down").length;
  const warning = snapshot.items.filter((item) => item.state === "warning").length;

  if (down > 0) {
    return {
      title: `${down} sistem durdu${warning > 0 ? `, ${warning} uyarı` : ""}`,
      tone: "danger",
    };
  }
  if (warning > 0) {
    return { title: `${warning} sistem uyarı veriyor`, tone: "warning" };
  }
  return { title: "Tüm sistemler çalışıyor", tone: "info" };
}

export function buildSystemReportMail(snapshot: SystemHealthSnapshot, appUrl: string) {
  const summary = overallSummary(snapshot);
  const checkedAt = new Date(snapshot.checkedAt).toLocaleString("tr-TR", {
    timeZone: "Asia/Baku",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rows = snapshot.items.map(statusRow).join("");
  const queueDetails = snapshot.queue
    ? infoRow(
        "Kuyruk",
        snapshot.queue.connected
          ? `Bekleyen ${snapshot.queue.waiting}, aktif ${snapshot.queue.active}, başarısız ${snapshot.queue.failed}`
          : "Bağlı değil",
      )
    : "";

  const bodyHtml = [
    `<div style="margin:0 0 18px;padding:14px 16px;border-radius:12px;background:${
      summary.tone === "danger" ? "#fef2f2" : summary.tone === "warning" ? "#fffbeb" : "#f0fdf4"
    };border:1px solid ${
      summary.tone === "danger" ? "#fecaca" : summary.tone === "warning" ? "#fde68a" : "#bbf7d0"
    };">
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(summary.title)}</p>
    </div>`,
    infoTable(
      infoRow("Sunucu", snapshot.hostname) +
        infoRow("Ortam", snapshot.nodeEnv) +
        infoRow("Kontrol zamanı", checkedAt) +
        queueDetails,
    ),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Sistem</th>
          <th align="left" style="padding:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Durum</th>
          <th align="left" style="padding:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Detay</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`,
  ].join("");

  const textLines = [
    summary.title,
    "",
    `Sunucu: ${snapshot.hostname}`,
    `Kontrol: ${checkedAt}`,
    "",
    ...snapshot.items.map(
      (item) => `${item.label}: ${healthStateLabel(item.state)} — ${item.message}`,
    ),
  ];

  const content = createBrandEmail({
    brand: "Vexira Host",
    tagline: "Saatlik sistem raporu",
    appUrl,
    title: "Saatlik Sistem Raporu",
    subtitle: "WHMCS tarzı durum özeti — hangi servislerin çalıştığı ve hangilerinin durduğu.",
    bodyHtml,
    footer: "Bu e-posta her saat başı otomatik gönderilir.",
  });

  const subjectSuffix =
    snapshot.overall === "healthy"
      ? "Tüm sistemler çalışıyor"
      : snapshot.overall === "degraded"
        ? "Uyarılar var"
        : "Kritik sorunlar var";

  return {
    ...content,
    subject: `[Vexira Host] Saatlik Sistem Raporu — ${subjectSuffix}`,
    text: `${content.text}\n\n${textLines.join("\n")}`,
  };
}
