"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminImpersonateButton } from "@/components/admin/admin-impersonate-button";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { PageHeader } from "@/components/ui";
import { getAdminUser, updateAdminUser, type AdminUser } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminUserEditPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.users");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const currentUser = useAuthStore((s) => s.user);
  const userId = typeof params.id === "string" ? params.id : "";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            <Link
              href="/t4abriz/panel/users"
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container-low"
            >
              {tu("back")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={tp("orders")} value={String(user.orderCount)} />
        <Stat label={tp("tickets")} value={String(user.ticketCount)} />
        <Stat label={tp("joined")} value={formatDate(user.createdAt, locale)} />
      </div>

      <AdminUserForm
        user={user}
        isSelf={currentUser?.id === user.id}
        submitLabel={tf("saveUser")}
        onSubmit={async (values) => {
          const updated = await updateAdminUser(user.id, values);
          setUser(updated);
          toast(tt("userUpdated"), "success");
          router.push("/t4abriz/panel/users");
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
