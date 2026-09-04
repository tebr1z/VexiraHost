"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

const WHATSAPP_ENDPOINT = "https://api.vexirahost.com/api/v1/whatsapp/messages";

const CURL_EXAMPLE = `curl -X POST "${WHATSAPP_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: vxwa_live_your_key" \\
  -d '{"phone":"+994501234567","message":"Hello from Vexira"}'`;

export default function ApiDocumentationPage(): React.ReactElement {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.apiDocs");
  const tw = useTranslations("dashboard.pages.whatsappApi");
  const [copied, setCopied] = useState(false);

  const bodyExample = useMemo(
    () =>
      JSON.stringify(
        {
          phone: "+994501234567",
          message: "Hello from Vexira",
        },
        null,
        2,
      ),
    [],
  );

  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL_EXAMPLE);
    setCopied(true);
    toast(tw("copied"), "success");
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[{ label: t("nav.dashboard"), href: "/dashboard" }, { label: tp("title") }]}
      />

      <section className="dashboard-section-card space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <span className="material-symbols-outlined text-[25px]">api</span>
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--label-primary)]">
                {tp("whatsappTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--label-secondary)]">
                {tp("whatsappDescription")}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {tp("available")}
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[var(--label-primary)]">{tw("docsTitle")}</h3>
          <p className="mt-1 text-sm text-[var(--label-secondary)]">{tw("docsHelp")}</p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                {tp("endpointLabel")}
              </p>
              <code className="block overflow-x-auto rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--label-primary)]">
                POST {WHATSAPP_ENDPOINT}
              </code>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                {tp("headersLabel")}
              </p>
              <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3 text-xs text-neutral-100">
                <code>{`Content-Type: application/json
X-API-Key: vxwa_live_your_key`}</code>
              </pre>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                {tp("bodyLabel")}
              </p>
              <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3 text-xs text-neutral-100">
                <code>{bodyExample}</code>
              </pre>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                  {tp("curlLabel")}
                </p>
                <button
                  type="button"
                  onClick={() => void copyCurl()}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  {copied ? tw("copied") : tw("copy")}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-100">
                <code>{CURL_EXAMPLE}</code>
              </pre>
            </div>
          </div>
        </div>

        <Link href="/dashboard/whatsapp-api" className="dashboard-btn-primary inline-flex">
          {tp("openWhatsappDocs")}
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--separator)] bg-[var(--fill-secondary)] p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <span className="material-symbols-outlined">rocket_launch</span>
          </span>
          <h2 className="text-lg font-bold tracking-tight text-[var(--label-primary)]">
            {tp("comingSoonTitle")}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--label-secondary)]">
          {tp("comingSoonDescription")}
        </p>
      </section>
    </div>
  );
}
