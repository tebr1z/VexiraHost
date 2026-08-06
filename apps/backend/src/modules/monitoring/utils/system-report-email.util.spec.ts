import type { SystemHealthSnapshot } from "../system-report.types";
import {
  buildSystemReportMail,
  healthStateLabel,
  resolveOverallHealth,
} from "../utils/system-report-email.util";

describe("system-report-email.util", () => {
  const baseSnapshot: SystemHealthSnapshot = {
    checkedAt: "2026-08-05T12:00:00.000Z",
    hostname: "vexira-api",
    nodeEnv: "production",
    overall: "healthy",
    items: [
      { key: "api", label: "API Sunucusu", state: "ok", message: "NestJS API çalışıyor" },
      { key: "database", label: "PostgreSQL", state: "ok", message: "Veritabanı bağlantısı aktif" },
    ],
  };

  it("labels health states in Turkish", () => {
    expect(healthStateLabel("ok")).toBe("Çalışıyor");
    expect(healthStateLabel("down")).toBe("Durdu");
  });

  it("marks snapshot critical when any system is down", () => {
    const overall = resolveOverallHealth([
      { key: "api", label: "API", state: "ok", message: "ok" },
      { key: "db", label: "DB", state: "down", message: "down" },
    ]);
    expect(overall).toBe("critical");
  });

  it("builds hourly report subject with healthy summary", () => {
    const mail = buildSystemReportMail(baseSnapshot, "https://vexirahost.com");
    expect(mail.subject).toContain("Saatlik Sistem Raporu");
    expect(mail.subject).toContain("Tüm sistemler çalışıyor");
    expect(mail.html).toContain("PostgreSQL");
    expect(mail.html).toContain("Çalışıyor");
  });

  it("builds critical subject when systems are down", () => {
    const snapshot: SystemHealthSnapshot = {
      ...baseSnapshot,
      overall: "critical",
      items: [
        ...baseSnapshot.items,
        { key: "redis", label: "Redis", state: "down", message: "Redis yanıt vermiyor" },
      ],
    };
    const mail = buildSystemReportMail(snapshot, "https://vexirahost.com");
    expect(mail.subject).toContain("Kritik sorunlar var");
    expect(mail.text).toContain("Redis: Durdu");
  });
});
