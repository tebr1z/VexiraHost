"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  DataTable,
  EditIconLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableRowActions,
} from "@/components/ui";
import {
  deleteAdminCampaign,
  listAdminCampaignSubscribers,
  listAdminCampaigns,
  setAdminMarketingOptIn,
  type AdminCampaign,
  type AdminMarketingSubscriber,
  type SubscriberFilter,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminCampaignsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.campaigns");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [rows, setRows] = useState<AdminCampaign[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [unsubscribedCount, setUnsubscribedCount] = useState(0);
  const [subscribers, setSubscribers] = useState<AdminMarketingSubscriber[]>([]);
  const [filter, setFilter] = useState<SubscriberFilter>("subscribed");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    return listAdminCampaigns()
      .then((data) => {
        setRows(data.campaigns);
        setSubscriberCount(data.subscriberCount);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadSubscribers = useCallback(() => {
    setSubsLoading(true);
    return listAdminCampaignSubscribers({ filter, q: query })
      .then((data) => {
        setSubscribers(data.subscribers);
        setSubscriberCount(data.subscriberCount);
        setUnsubscribedCount(data.unsubscribedCount);
      })
      .finally(() => setSubsLoading(false));
  }, [filter, query]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadCampaigns();
  }, [isAdmin, loadCampaigns]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadSubscribers();
  }, [isAdmin, loadSubscribers]);

  const handleToggle = async (row: AdminMarketingSubscriber) => {
    const next = !row.marketingOptIn;
    setTogglingId(row.id);
    try {
      await setAdminMarketingOptIn(row.id, next);
      toast(next ? tp("subscribedOk") : tp("unsubscribedOk"), "success");
      await Promise.all([loadSubscribers(), loadCampaigns()]);
    } catch (err) {
      toast(getApiErrorMessage(err, tp("toggleFailed")), "error");
    } finally {
      setTogglingId(null);
    }
  };

  if (!isAdmin) return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;

  const filterBtn = (value: SubscriberFilter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        filter === value
          ? "bg-primary text-on-primary"
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description", { count: subscriberCount })}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
        actions={
          <Link
            href="/t4abriz/panel/campaigns/new"
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {tp("add")}
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-primary text-lg font-semibold">{tp("subscribersTitle")}</h2>
            <p className="text-on-surface-variant text-sm">
              {tp("subscribersHint", {
                subscribed: subscriberCount,
                unsubscribed: unsubscribedCount,
              })}
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(searchInput.trim());
            }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="border-outline-variant h-10 w-56 rounded-xl border px-3 text-sm"
            />
            <button
              type="submit"
              className="bg-surface-container-high h-10 rounded-xl px-4 text-sm font-medium"
            >
              {tp("search")}
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterBtn("subscribed", tp("filterSubscribed", { count: subscriberCount }))}
          {filterBtn("unsubscribed", tp("filterUnsubscribed", { count: unsubscribedCount }))}
          {filterBtn("all", tp("filterAll"))}
        </div>

        <DataTable
          data={subscribers as unknown as Record<string, unknown>[]}
          loading={subsLoading}
          emptyMessage={tp("subscribersEmpty")}
          getRowKey={(row) => String(row.id)}
          columns={[
            {
              key: "email",
              header: tp("colEmail"),
              sortable: true,
              render: (row) => {
                const sub = row as unknown as AdminMarketingSubscriber;
                const name = [sub.firstName, sub.lastName].filter(Boolean).join(" ");
                return (
                  <div>
                    <p className="font-medium">{sub.email}</p>
                    {name ? <p className="text-on-surface-variant text-xs">{name}</p> : null}
                  </div>
                );
              },
            },
            {
              key: "status",
              header: tu("table.status"),
              render: (row) => (
                <StatusBadge status={(row as unknown as AdminMarketingSubscriber).status} />
              ),
            },
            {
              key: "marketingOptIn",
              header: tp("colSubscription"),
              render: (row) => {
                const sub = row as unknown as AdminMarketingSubscriber;
                return (
                  <span
                    className={`text-sm font-medium ${
                      sub.marketingOptIn
                        ? "text-green-700 dark:text-green-400"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {sub.marketingOptIn ? tp("statusSubscribed") : tp("statusUnsubscribed")}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (row) => {
                const sub = row as unknown as AdminMarketingSubscriber;
                const busy = togglingId === sub.id;
                return (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggle(sub)}
                    className={`text-sm font-semibold hover:underline disabled:opacity-60 ${
                      sub.marketingOptIn ? "text-error" : "text-secondary"
                    }`}
                  >
                    {busy ? "…" : sub.marketingOptIn ? tp("unsubscribeBtn") : tp("subscribeBtn")}
                  </button>
                );
              },
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-primary text-lg font-semibold">{tp("campaignsListTitle")}</h2>
        <DataTable
          data={rows as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage={tu("noRecords")}
          getRowKey={(row) => String(row.id)}
          columns={[
            {
              key: "subject",
              header: tp("colSubject"),
              sortable: true,
              render: (row) => {
                const campaign = row as unknown as AdminCampaign;
                return <span className="text-on-surface font-medium">{campaign.subject}</span>;
              },
            },
            {
              key: "status",
              header: tu("table.status"),
              render: (row) => <StatusBadge status={(row as unknown as AdminCampaign).status} />,
            },
            {
              key: "stats",
              header: tp("colStats"),
              render: (row) => {
                const c = row as unknown as AdminCampaign;
                if (c.status === "DRAFT") return "—";
                return `${c.successCount}/${c.recipientCount}`;
              },
            },
            {
              key: "sentAt",
              header: tp("colSent"),
              render: (row) => {
                const c = row as unknown as AdminCampaign;
                return c.sentAt ? formatDate(c.sentAt, locale) : "—";
              },
            },
            {
              key: "actions",
              header: "",
              render: (row) => {
                const campaign = row as unknown as AdminCampaign;
                const canEdit = campaign.status !== "SENT" && campaign.status !== "SENDING";
                return (
                  <TableRowActions>
                    {canEdit ? (
                      <EditIconLink
                        href={`/t4abriz/panel/campaigns/${campaign.id}`}
                        label={tu("edit")}
                      />
                    ) : null}
                    {canEdit ? (
                      <button
                        type="button"
                        className="text-error text-sm hover:underline"
                        onClick={async () => {
                          if (!confirm(`${t("actions.delete")} ${campaign.subject}?`)) return;
                          try {
                            await deleteAdminCampaign(campaign.id);
                            toast(tp("deleted"), "success");
                            void loadCampaigns();
                          } catch {
                            toast(tp("deleteFailed"), "error");
                          }
                        }}
                      >
                        {t("actions.delete")}
                      </button>
                    ) : null}
                  </TableRowActions>
                );
              },
            },
          ]}
        />
        {!loading && rows.length === 0 && (
          <EmptyState title={tp("empty")} description={tp("emptyDesc")} />
        )}
      </section>
    </div>
  );
}
