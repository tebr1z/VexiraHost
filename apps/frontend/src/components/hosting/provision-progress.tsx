"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const STAGE_KEYS = [
  "PAYMENT_CONFIRMED",
  "CONNECTING_PANEL",
  "CREATING_CUSTOMER",
  "CREATING_WEBSPACE",
  "FINALIZING",
  "COMPLETED",
] as const;

function stageIndex(stage: string | null | undefined): number {
  if (!stage) return 0;
  const idx = STAGE_KEYS.indexOf(stage as (typeof STAGE_KEYS)[number]);
  return idx >= 0 ? idx : 0;
}

export function ProvisionProgress({
  stage,
  error,
  status,
}: {
  stage: string | null | undefined;
  error?: string | null;
  status: string;
}): React.ReactElement {
  const t = useTranslations("dashboard.provision");
  const failed = status === "FAILED" || stage === "FAILED";
  const current = failed ? stageIndex(stage) : stageIndex(stage);
  const showSupportMessage = failed || Boolean(error);

  return (
    <div className="panel-card rounded-lg p-5">
      <h2 className="font-jakarta text-primary text-lg font-semibold">{t("title")}</h2>
      <p className="text-on-surface-variant mt-1 text-sm">
        {failed
          ? t("failedHint")
          : status === "PROVISIONING"
            ? t("inProgressHint")
            : t("completeHint")}
      </p>

      <ol className="mt-5 space-y-3">
        {STAGE_KEYS.map((key, index) => {
          const done = !failed && current > index;
          const active = !failed && current === index && status === "PROVISIONING";
          const failedHere = failed && current === index;

          return (
            <li key={key} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-green-100 text-green-800",
                  active && "bg-primary text-on-primary animate-pulse",
                  failedHere && "bg-red-100 text-red-800",
                  !done && !active && !failedHere && "text-on-surface-variant bg-slate-100",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              <div>
                <p className={cn("text-sm font-medium", active && "text-primary")}>
                  {t(`stages.${key}`)}
                </p>
                {active && <p className="text-on-surface-variant text-xs">{t("pleaseWait")}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {showSupportMessage ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="mt-1">{t("supportMessage")}</p>
          <Link
            href="/dashboard/tickets/new"
            className="mt-2 inline-block font-semibold text-red-900 underline hover:no-underline"
          >
            {t("contactSupport")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
