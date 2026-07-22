"use client";

import type { AuthSession } from "@vexira/types";
import { UserRole } from "@vexira/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { impersonateAdminUser, type AdminUser } from "@/features/admin";
import { useAuthStore } from "@/stores/auth-store";
import { useImpersonationStore } from "@/stores/impersonation-store";
import { toast } from "@/stores/toast-store";

export function AdminImpersonateButton({
  user,
  className,
}: {
  user: AdminUser;
  className?: string;
}): React.ReactElement | null {
  const tu = useTranslations("admin.users");
  const tt = useTranslations("admin.toasts");
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const rememberMe = useAuthStore((s) => s.rememberMe);
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isSelf = currentUser?.id === user.id;
  const isAdminTarget = user.role === UserRole.ADMIN;
  const isSuspended = user.status === "SUSPENDED";

  if (!isAdmin || isSelf || isAdminTarget || isSuspended) {
    return null;
  }

  const handleImpersonate = async () => {
    if (!currentUser || !accessToken || !refreshToken) {
      return;
    }

    const adminSession: AuthSession = {
      user: currentUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: "15m",
      },
    };

    setLoading(true);
    try {
      const session = await impersonateAdminUser(user.id);
      useImpersonationStore
        .getState()
        .beginImpersonation(adminSession, session.user.email, rememberMe);
      setSession(session);
      window.location.assign("/dashboard");
    } catch {
      useImpersonationStore.getState().clearImpersonation();
      toast(tt("impersonateFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleImpersonate}
      className={
        className ??
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
      }
    >
      <span className="material-symbols-outlined text-base">login</span>
      {loading ? tu("loginAsUserLoading") : tu("loginAsUser")}
    </button>
  );
}
