"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { isValidIpAddress } from "@/lib/ip-address";

export interface NsGlueEntry {
  host: string;
  ip: string;
}

const DEFAULT_SUFFIX = "vexirahost.com";

interface DomainNsGlueEditorProps {
  entries: NsGlueEntry[];
  onChange: (entries: NsGlueEntry[]) => void;
  hostSuffix?: string;
  translationScope: "dashboard" | "admin";
  onValidationError?: (message: string | null) => void;
}

export function DomainNsGlueEditor({
  entries,
  onChange,
  hostSuffix = DEFAULT_SUFFIX,
  translationScope,
  onValidationError,
}: DomainNsGlueEditorProps): React.ReactElement {
  const t = useTranslations(
    translationScope === "dashboard" ? "dashboard.pages.domains" : "admin.pages.users.domains",
  );
  const [newHostPrefix, setNewHostPrefix] = useState("");
  const [newIp, setNewIp] = useState("");
  const [invalidIpIndexes, setInvalidIpIndexes] = useState<Set<number>>(new Set());

  const reportIpError = (ip: string) => {
    if (!ip.trim()) {
      onValidationError?.(null);
      return true;
    }
    if (!isValidIpAddress(ip)) {
      onValidationError?.(t("ipInvalidFormat"));
      return false;
    }
    onValidationError?.(null);
    return true;
  };

  const updateEntry = (index: number, patch: Partial<NsGlueEntry>) => {
    const next = entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    onChange(next);

    if (patch.ip !== undefined) {
      const ipValue = patch.ip;
      const valid = isValidIpAddress(ipValue);
      setInvalidIpIndexes((prev) => {
        const updated = new Set(prev);
        if (!ipValue.trim()) {
          updated.delete(index);
        } else if (!valid) {
          updated.add(index);
          onValidationError?.(t("ipInvalidFormat"));
        } else {
          updated.delete(index);
        }
        return updated;
      });
    }
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
    setInvalidIpIndexes((prev) => {
      const updated = new Set<number>();
      for (const i of prev) {
        if (i < index) updated.add(i);
        if (i > index) updated.add(i - 1);
      }
      return updated;
    });
  };

  const addEntry = () => {
    const prefix = newHostPrefix.trim().toLowerCase();
    if (!prefix) return;
    if (!reportIpError(newIp)) return;

    const host = prefix.includes(".") ? prefix : `${prefix}.${hostSuffix}`;
    if (entries.some((entry) => entry.host.trim().toLowerCase() === host)) return;

    onChange([...entries, { host, ip: newIp.trim() }]);
    setNewHostPrefix("");
    setNewIp("");
  };

  const nextPrefix = `ns${entries.length + 1}`;

  return (
    <div className="space-y-5">
      <div className="border-primary/20 bg-primary/5 rounded-xl border px-4 py-3">
        <h3 className="text-on-surface text-base font-semibold">{t("nsGlueTitle")}</h3>
        <p className="text-on-surface-variant mt-1.5 text-sm leading-relaxed">{t("nsGlueHint")}</p>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${entry.host}-${index}`}
            className="border-outline-variant/40 bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className="block space-y-1.5">
              <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                {t("nsGlueHostColumn")}
              </span>
              <input
                type="text"
                value={entry.host}
                onChange={(e) => updateEntry(index, { host: e.target.value })}
                placeholder={`ns${index + 1}.${hostSuffix}`}
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                {t("nsGlueIpColumn")}
              </span>
              <input
                type="text"
                value={entry.ip}
                onChange={(e) => updateEntry(index, { ip: e.target.value })}
                onBlur={() => reportIpError(entry.ip)}
                placeholder={t("nsGlueIpPlaceholder")}
                aria-invalid={invalidIpIndexes.has(index)}
                className={`bg-surface-container-lowest w-full rounded-lg border px-3 py-2.5 font-mono text-sm ${
                  invalidIpIndexes.has(index)
                    ? "border-error text-error"
                    : "border-outline-variant/40"
                }`}
              />
            </label>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              disabled={entries.length <= 2}
              className="border-outline-variant/50 text-on-surface-variant hover:border-error/40 hover:text-error h-10 rounded-lg border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("nsGlueDelete")}
            </button>
          </div>
        ))}
      </div>

      <div className="border-outline-variant/50 bg-surface-container-lowest rounded-xl border border-dashed p-4">
        <h4 className="text-on-surface text-sm font-semibold">{t("nsGlueAddTitle")}</h4>
        <p className="text-on-surface-variant mt-1 text-xs">{t("nsGlueAddHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block space-y-1.5">
            <span className="text-on-surface text-xs font-medium">{t("nsGlueHostLabel")}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newHostPrefix}
                onChange={(e) => setNewHostPrefix(e.target.value)}
                placeholder={nextPrefix}
                className="border-outline-variant/40 bg-surface w-full min-w-0 rounded-lg border px-3 py-2.5 font-mono text-sm"
              />
              <span className="text-on-surface-variant shrink-0 font-mono text-sm">
                .{hostSuffix}
              </span>
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-on-surface text-xs font-medium">{t("nsGlueIpColumn")}</span>
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              onBlur={() => reportIpError(newIp)}
              placeholder={t("nsGlueIpPlaceholder")}
              className="border-outline-variant/40 bg-surface w-full rounded-lg border px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <button
            type="button"
            onClick={addEntry}
            disabled={!newHostPrefix.trim()}
            className="bg-secondary text-on-secondary inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
          >
            {t("nsGlueAdd")}
          </button>
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_NS_GLUE: NsGlueEntry[] = [
  { host: "ns1.vexirahost.com", ip: "" },
  { host: "ns2.vexirahost.com", ip: "" },
];

export function validateGlueEntries(
  entries: NsGlueEntry[],
  invalidIpMessage: string,
): string | null {
  for (const entry of entries) {
    if (entry.ip.trim() && !isValidIpAddress(entry.ip)) {
      return invalidIpMessage;
    }
  }
  return null;
}
