"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { DnsRecord } from "@/features/domains";
import { formatDnsZone, parseDnsZone } from "@/lib/dns-zone";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;

interface DomainDnsRecordsEditorProps {
  records: DnsRecord[];
  onChange: (records: DnsRecord[]) => void;
  disabled?: boolean;
}

export function DomainDnsRecordsEditor({
  records,
  onChange,
  disabled = false,
}: DomainDnsRecordsEditorProps): React.ReactElement {
  const t = useTranslations("dashboard.pages.domains");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const update = (index: number, patch: Partial<DnsRecord>) => {
    onChange(
      records.map((record, rowIndex) => (rowIndex === index ? { ...record, ...patch } : record)),
    );
  };

  const add = () => {
    onChange([...records, { type: "A", name: "@", value: "", ttl: 3600, proxied: false }]);
  };

  const applyImport = () => {
    const parsed = parseDnsZone(importText);
    if (parsed.length === 0) return;
    onChange(parsed);
    setImportText("");
    setShowImport(false);
  };

  const exportZone = () => {
    const blob = new Blob([formatDnsZone(records)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dns-zone.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border px-4 py-3">
        <h3 className="text-on-surface text-base font-semibold">{t("dnsTitle")}</h3>
        <p className="text-on-surface-variant mt-1.5 text-sm">{t("dnsDescription")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={add}
          className="bg-secondary text-on-secondary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("dnsAddRecord")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowImport((current) => !current)}
          className="border-outline-variant/40 bg-surface rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("bulkImport")}
        </button>
        <button
          type="button"
          disabled={disabled || records.length === 0}
          onClick={exportZone}
          className="border-outline-variant/40 bg-surface rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("exportZone")}
        </button>
      </div>

      {showImport ? (
        <div className="border-outline-variant/40 bg-surface-container-low space-y-3 rounded-xl border p-4">
          <textarea
            rows={6}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={t("importPlaceholder")}
            className="border-outline-variant/40 bg-surface w-full rounded-lg border p-3 font-mono text-sm"
          />
          <button
            type="button"
            disabled={!parseDnsZone(importText).length}
            onClick={applyImport}
            className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t("applyImport")}
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {records.length === 0 ? (
          <p className="text-on-surface-variant rounded-xl border border-dashed p-5 text-sm">
            {t("dnsEmpty")}
          </p>
        ) : null}
        {records.map((record, index) => (
          <div
            key={record.id ?? `${record.type}-${record.name}-${index}`}
            className="border-outline-variant/40 bg-surface grid gap-3 rounded-xl border p-4 lg:grid-cols-[7rem_1fr_2fr_7rem_7rem_6rem_auto] lg:items-end"
          >
            <label className="space-y-1">
              <span className="text-on-surface-variant text-xs font-semibold">{t("dnsType")}</span>
              <select
                value={record.type}
                disabled={disabled}
                onChange={(event) => {
                  const type = event.target.value;
                  update(index, {
                    type,
                    ...(!["A", "AAAA", "CNAME"].includes(type) ? { proxied: false } : {}),
                  });
                }}
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2 font-mono text-sm"
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-on-surface-variant text-xs font-semibold">{t("dnsName")}</span>
              <input
                value={record.name}
                disabled={disabled}
                onChange={(event) => update(index, { name: event.target.value })}
                placeholder="@"
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-on-surface-variant text-xs font-semibold">{t("dnsValue")}</span>
              <input
                value={record.value}
                disabled={disabled}
                onChange={(event) => update(index, { value: event.target.value })}
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-on-surface-variant text-xs font-semibold">TTL</span>
              <input
                type="number"
                min={60}
                max={86400}
                value={record.ttl}
                disabled={disabled || record.proxied === true}
                onChange={(event) => update(index, { ttl: Number(event.target.value) || 3600 })}
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-on-surface-variant text-xs font-semibold">
                {t("dnsPriority")}
              </span>
              <input
                type="number"
                min={0}
                max={65535}
                value={record.priority ?? ""}
                disabled={disabled || record.type !== "MX"}
                onChange={(event) =>
                  update(index, {
                    priority: event.target.value ? Number(event.target.value) : null,
                  })
                }
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2 font-mono text-sm disabled:opacity-50"
              />
            </label>
            <label className="flex h-10 items-center gap-2 pb-0.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={record.proxied === true}
                disabled={disabled || !["A", "AAAA", "CNAME"].includes(record.type)}
                onChange={(event) =>
                  update(index, {
                    proxied: event.target.checked,
                    ...(event.target.checked ? { ttl: 3600 } : {}),
                  })
                }
                className="border-outline-variant/60 size-4 rounded"
              />
              <span className="text-on-surface-variant">{t("dnsProxy")}</span>
            </label>
            <button
              type="button"
              disabled={disabled || records.length <= 1}
              onClick={() => onChange(records.filter((_, rowIndex) => rowIndex !== index))}
              className="border-error/40 text-error hover:bg-error/10 h-10 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40"
            >
              {t("dnsDelete")}
            </button>
          </div>
        ))}
      </div>

      <p className="text-on-surface-variant text-xs">{t("dnsReplaceWarning")}</p>
    </div>
  );
}
