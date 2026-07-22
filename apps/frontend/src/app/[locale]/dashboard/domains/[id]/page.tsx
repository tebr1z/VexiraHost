"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { getDnsRecords, updateDnsRecords, type DnsRecord } from "@/features/domains";
import { formatDnsZone, parseDnsZone } from "@/lib/dns-zone";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

export default function DomainDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.domains");
  const tu = useTranslations("ui");
  const domainId = params.id as string;
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    getDnsRecords(domainId)
      .then(setRecords)
      .catch(() => setError(tc("dnsLoadFailed")))
      .finally(() => setLoading(false));
  }, [domainId, tc]);

  const updateRecord = (index: number, field: keyof DnsRecord, value: string | number) => {
    setRecords((prev) =>
      prev.map((record, i) => (i === index ? { ...record, [field]: value } : record)),
    );
  };

  const addRecord = () => {
    setRecords((prev) => [...prev, { type: "A", name: "@", value: "192.0.2.1", ttl: 3600 }]);
  };

  const removeRecord = (index: number) => {
    setRecords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateDnsRecords(domainId, records);
      setRecords(updated);
      setMessage(tc("dnsUpdated"));
    } catch {
      setError(tc("dnsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([formatDnsZone(records)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dns-zone-${domainId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const parsed = parseDnsZone(importText);
    if (parsed.length === 0) {
      setError(tp("importError"));
      return;
    }
    setRecords(parsed);
    setShowImport(false);
    setImportText("");
    setError(null);
    setMessage(tc("dnsUpdated"));
  };

  if (loading) {
    return <LoadingSkeletonList rows={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("dnsTitle")}
        description={tp("dnsDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.domains"), href: "/dashboard/domains" },
          { label: tp("dnsBreadcrumb") },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={records.length === 0}
          className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {tp("exportZone")}
        </button>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold"
        >
          {tp("bulkImport")}
        </button>
      </div>

      {showImport && (
        <div className="space-y-3 rounded-2xl border border-outline-variant/50 bg-surface p-4">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={tp("importPlaceholder")}
            rows={6}
            className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm font-mono"
          />
          <button
            type="button"
            onClick={handleImport}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary"
          >
            {tp("applyImport")}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {records.map((record, index) => (
          <div
            key={record.id ?? index}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-outline-variant/50 bg-surface p-4 sm:grid-cols-6"
          >
            <select
              value={record.type}
              onChange={(e) => updateRecord(index, "type", e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
            >
              {RECORD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              value={record.name}
              onChange={(e) => updateRecord(index, "name", e.target.value)}
              placeholder={tc("recordNamePlaceholder")}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
            />
            <input
              value={record.value}
              onChange={(e) => updateRecord(index, "value", e.target.value)}
              placeholder={tc("value")}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              type="number"
              value={record.ttl}
              onChange={(e) => updateRecord(index, "ttl", Number(e.target.value))}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeRecord(index)}
              className="text-sm text-error hover:underline"
            >
              {tc("remove")}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addRecord}
          className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold"
        >
          {tc("addRecord")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || records.length === 0}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {saving ? tu("loading") : tc("saveChanges")}
        </button>
        <Link href="/dashboard/domains" className="rounded-xl px-4 py-2 text-sm text-secondary hover:underline">
          {tc("backToDomains")}
        </Link>
      </div>

      {message && <p className="text-secondary">{message}</p>}
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
