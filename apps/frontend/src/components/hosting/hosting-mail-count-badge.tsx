"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { getHostingMailSummary } from "@/features/hosting/services/hosting-mail.service";

export function HostingMailCountBadge({
  accountId,
}: {
  accountId: string;
}): React.ReactElement | null {
  const t = useTranslations("dashboard.pages.hosting.mail");
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHostingMailSummary(accountId)
      .then((summary) => {
        if (cancelled) return;
        const max = summary.maxMailboxes;
        setLabel(
          max != null && max > 0
            ? t("countWithLimit", { count: summary.count, max })
            : t("countUnlimited", { count: summary.count }),
        );
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, t]);

  if (!label) return null;

  return (
    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
      <span className="material-symbols-outlined text-[14px]">mail</span>
      {label}
    </span>
  );
}
