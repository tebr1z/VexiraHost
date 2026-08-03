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
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n/format";
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

  return (
    <article className="card-3d border-outline-variant/50 bg-surface hover:border-secondary/30 rounded-2xl border p-5 transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-primary truncate font-semibold">{account.primaryDomain}</p>
          <p className="text-on-surface-variant mt-1 text-sm">{subtitle}</p>
          {isManual && account.panelUsername ? (
            <p className="text-on-surface-variant mt-1 text-sm">
              {tc("username")}: {account.panelUsername}
            </p>
          ) : null}
          {account.expiresAt ? (
            <p className="text-on-surface-variant mt-1 text-sm">
              {tc("expires")}: {formatDate(account.expiresAt, locale)}
            </p>
          ) : null}
          {account.billingAmount != null && account.billingAmount > 0 ? (
            <p className="text-on-surface-variant mt-1 text-sm">
              {account.billingAmount.toFixed(2)} {account.billingCurrency ?? "USD"}
            </p>
          ) : null}
        </div>
        <StatusBadge status={account.status} />
      </div>

      {isSuspended && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
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

      <div className="border-outline-variant/30 mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
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
