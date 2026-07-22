"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { StatusBadge } from "@/components/ui";
import { AdminImpersonateButton } from "@/components/admin/admin-impersonate-button";
import { updateAdminUserRole, updateAdminUserStatus, type AdminUser } from "@/features/admin";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const ROLES = ["customer", "staff", "admin"] as const;

export function AdminUserActions({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (updated: AdminUser) => void;
}): React.ReactElement {
  const tu = useTranslations("admin.users");
  const tt = useTranslations("admin.toasts");
  const currentUser = useAuthStore((s) => s.user);
  const isSelf = currentUser?.id === user.id;
  const [saving, setSaving] = useState(false);

  const handleRoleChange = async (role: string) => {
    if (role === user.role) return;
    setSaving(true);
    try {
      const updated = await updateAdminUserRole(user.id, role);
      onUpdated(updated);
      toast(tt("roleUpdated"), "success");
    } catch {
      toast(tt("roleUpdateFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setSaving(true);
    try {
      const updated = await updateAdminUserStatus(user.id, nextStatus);
      onUpdated(updated);
      toast(nextStatus === "SUSPENDED" ? tt("userSuspended") : tt("userActivated"), "success");
    } catch {
      toast(tt("statusUpdateFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (isSelf) {
    return <span className="text-xs text-on-surface-variant">{tu("currentAccount")}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminImpersonateButton user={user} />
      <select
        value={user.role}
        disabled={saving}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="h-9 rounded-lg border border-outline-variant bg-surface px-2 text-sm capitalize"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {tu(`roles.${role}`)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={saving}
        onClick={handleStatusToggle}
        className={`h-9 rounded-lg px-3 text-sm font-medium ${
          user.status === "SUSPENDED"
            ? "bg-secondary/20 text-secondary hover:bg-secondary/30"
            : "bg-error-container text-error hover:opacity-90"
        }`}
      >
        {user.status === "SUSPENDED" ? tu("activate") : tu("suspend")}
      </button>
      <StatusBadge status={user.status} className="scale-90" />
    </div>
  );
}
