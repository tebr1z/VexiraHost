"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminImpersonateButton } from "@/components/admin/admin-impersonate-button";
import { AdminUserBalanceSection } from "@/components/admin/admin-user-balance-section";
import { AdminUserDomainsSection } from "@/components/admin/admin-user-domains-section";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { AdminUserHostingSection } from "@/components/admin/admin-user-hosting-section";
import { AdminUserWhatsappApiSection } from "@/components/admin/admin-user-whatsapp-api-section";
import { PageHeader } from "@/components/ui";
import { deleteAdminUser, getAdminUser, updateAdminUser, type AdminUser } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

type UserTab = "profile" | "domains" | "hosting" | "whatsappApi";

export default function AdminUserEditPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.users");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tUsers = useTranslations("admin.users");
  const tu = useTranslations("ui");
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const userId = typeof params.id === "string" ? params.id : "";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<UserTab>("profile");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getAdminUser(userId)
      .then(setUser)
      .catch(() => toast(tt("userLoadFailed"), "error"))
      .finally(() => setLoading(false));
  }, [userId, tt]);

  if (loading) return <p className="text-on-surface-variant">{tu("loading")}</p>;
  if (!user) return <p className="text-on-surface-variant">{tp("notFound")}</p>;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const isSelf = currentUser?.id === user.id;

  const handleDelete = async () => {
    if (!confirm(tUsers("deleteConfirm", { name: displayName }))) return;
    setDeleting(true);
    try {
      await deleteAdminUser(user.id);
      toast(tt("userDeleted"), "success");
      router.push("/t4abriz/panel/users");
    } catch (err) {
      toast(getApiErrorMessage(err, tt("userDeleteFailed")), "error");
    } finally {
      setDeleting(false);
    }
  };

  const tabs: { id: UserTab; label: string }[] = [
    { id: "profile", label: tp("tabs.profile") },
    { id: "domains", label: tp("tabs.domains") },
    { id: "hosting", label: tp("tabs.hosting") },
    { id: "whatsappApi", label: tp("tabs.whatsappApi") },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={displayName}
        description={user.email}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title"), href: "/t4abriz/panel/users" },
          { label: displayName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminImpersonateButton user={user} />
            {!isSelf ? (
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="border-error/40 text-error hover:bg-error-container rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {deleting ? tUsers("deleting") : tUsers("delete")}
              </button>
            ) : null}
            <Link
              href="/t4abriz/panel/users"
              className="border-outline-variant hover:bg-surface-container-low rounded-xl border px-4 py-2 text-sm font-medium"
            >
              {tu("back")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={tp("orders")} value={String(user.orderCount)} />
        <Stat label={tp("tickets")} value={String(user.ticketCount)} />
        <Stat label={tp("joined")} value={formatDate(user.createdAt, locale)} />
        <Stat
          label={tp("accountBalance")}
          value={`${Number(user.accountBalance ?? 0).toFixed(2)} ${user.balanceCurrency || "USD"}`}
        />
      </div>

      <div className="border-outline-variant/40 flex flex-wrap gap-2 border-b pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-t-xl px-4 py-2.5 text-sm font-semibold transition",
              tab === item.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card-3d rounded-2xl p-6">
        {tab === "profile" && (
          <>
            <AdminUserForm
              user={user}
              isSelf={currentUser?.id === user.id}
              submitLabel={tf("saveUser")}
              onSubmit={async (values) => {
                const updated = await updateAdminUser(user.id, values);
                setUser(updated);

                if (currentUser?.id === updated.id && accessToken && refreshToken) {
                  setSession({
                    user: {
                      ...currentUser,
                      preferredCurrency: updated.preferredCurrency,
                      billingPeriod: updated.billingPeriod,
                      currencyLocked: updated.currencyLocked,
                      currencyChangedAt: updated.currencyChangedAt,
                      canChangeCurrency: !updated.currencyLocked,
                      nextCurrencyChangeAt: null,
                      accountBalance: updated.accountBalance,
                      balanceCurrency: updated.balanceCurrency,
                    },
                    tokens: {
                      accessToken,
                      refreshToken,
                      expiresIn: "15m",
                    },
                  });
                  setFromUser({
                    preferredCurrency: updated.preferredCurrency,
                    billingPeriod: updated.billingPeriod,
                    currencyLocked: updated.currencyLocked,
                  });
                }

                toast(tt("userUpdated"), "success");
                router.push("/t4abriz/panel/users");
              }}
            />
            <AdminUserBalanceSection
              user={user}
              onUpdated={(next) => setUser((prev) => (prev ? { ...prev, ...next } : prev))}
            />
          </>
        )}

        {tab === "domains" && <AdminUserDomainsSection userId={user.id} />}
        {tab === "hosting" && <AdminUserHostingSection userId={user.id} />}
        {tab === "whatsappApi" && <AdminUserWhatsappApiSection userId={user.id} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="border-outline-variant/50 bg-surface-container-low rounded-xl border px-4 py-3">
      <p className="text-on-surface-variant text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
