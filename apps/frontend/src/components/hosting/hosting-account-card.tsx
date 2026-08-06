"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { StatusBadge } from "@/components/ui";
import {
  EyeIcon,
  IconActionButton,
  IconActionLink,
  LoginIcon,
  PencilIcon,
} from "@/components/ui/edit-icon-button";
import { openHostingPanel, type HostingAccount } from "@/features/hosting";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";
import { useNavigationProgressStore } from "@/stores/navigation-progress-store";
import { toast } from "@/stores/toast-store";

export function HostingAccountCard({
  account,
  locale,
}: {
  account: HostingAccount;
  locale: string;
}): React.ReactElement {
  const tu = useTranslations("ui");
  const tc = useTranslations("dashboard.common");
  const router = useRouter();
  const startNav = useNavigationProgressStore((s) => s.start);
  const [panelLoading, setPanelLoading] = useState(false);
  const detailHref = `/dashboard/hosting/${account.id}`;
  const isManual = account.managementMode === "MANUAL";
  const isServer = account.serviceCategory === "SERVER";
  const isSuspended = account.status === "SUSPENDED";

  const subtitle = isManual
    ? [
        isServer ? tc("categoryServer") : tc("categoryHosting"),
        account.panel,
        account.panelIp ?? account.server?.ipAddress,
      ]
        .filter(Boolean)
        .join(" · ")
    : [account.plan.name, account.panel, account.server?.name].filter(Boolean).join(" · ");

  const handlePanelLogin = async () => {
    setPanelLoading(true);
    try {
      await openHostingPanel(account.id);
      toast(tc("openingPanel"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tc("panelLoginFailed");
      toast(msg ?? tc("panelLoginFailed"), "error");
    } finally {
      setPanelLoading(false);
    }
  };

  const openDetail = () => {
    startNav();
    router.push(detailHref);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      className={cn(
        "dashboard-nav-card rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 shadow-sm",
      )}
      onClick={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("a,button,[data-stop-row-click='true']")) return;
        openDetail();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="bg-[var(--accent)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]">
            <span className="material-symbols-outlined text-[22px]">dns</span>
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--label-primary)]">
              {account.primaryDomain}
            </p>
            <p className="mt-1 text-sm text-[var(--label-secondary)]">{subtitle}</p>
            {isManual && account.panelUsername ? (
              <p className="mt-1 text-sm text-[var(--label-secondary)]">
                {tc("username")}: {account.panelUsername}
              </p>
            ) : null}
            {account.expiresAt ? (
              <p className="mt-1 text-sm text-[var(--label-secondary)]">
                {tc("expires")}: {formatDate(account.expiresAt, locale)}
              </p>
            ) : null}
            {account.billingAmount != null && account.billingAmount > 0 ? (
              <p className="mt-1 text-sm text-[var(--label-secondary)]">
                {account.billingAmount.toFixed(2)} {account.billingCurrency ?? "USD"}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={account.status} />
          <span className="dashboard-nav-card-chevron inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--label-tertiary)]">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </span>
        </div>
      </div>

      {isSuspended && (
        <div
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
          data-stop-row-click="true"
        >
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {tc("suspendedTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-50/90">
            {tc("suspendedBody")}
          </p>
          {account.graceEndsAt && (
            <p className="mt-2 text-xs font-medium text-amber-950 dark:text-amber-100">
              {tc("graceUntil")}: {formatDate(account.graceEndsAt, locale)}
            </p>
          )}
          <Link
            href={
              account.renewalInvoiceId
                ? `/dashboard/invoices/${account.renewalInvoiceId}`
                : "/dashboard/invoices"
            }
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white"
          >
            {tc("payInvoice")}
          </Link>
        </div>
      )}

      <div
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--separator)] pt-4"
        data-stop-row-click="true"
        onClick={(event) => event.stopPropagation()}
      >
        <IconActionLink href={detailHref} label={tu("view")} variant="view" showLabel>
          <EyeIcon />
        </IconActionLink>
        <IconActionLink href={detailHref} label={tu("edit")} variant="edit" showLabel>
          <PencilIcon />
        </IconActionLink>
        {account.status === "ACTIVE" ? (
          <IconActionButton
            label={panelLoading ? tc("opening") : tc("panelLogin")}
            variant="login"
            showLabel
            disabled={panelLoading}
            onClick={() => void handlePanelLogin()}
          >
            <LoginIcon />
          </IconActionButton>
        ) : null}
      </div>
    </article>
  );
}
