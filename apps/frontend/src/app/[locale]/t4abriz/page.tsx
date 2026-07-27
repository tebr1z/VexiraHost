"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ADMIN_PANEL_PATH } from "@/components/admin/admin-nav-config";
import { useAuthHydration } from "@/features/auth/hooks/use-auth";
import { stashAuthNext } from "@/features/auth/lib/auth-redirect";
import { useRouter } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/is-staff-role";
import { useAuthStore } from "@/stores/auth-store";
import { isViewingAsImpersonatedUser, useImpersonationStore } from "@/stores/impersonation-store";

export default function AdminEntryPage(): React.ReactElement {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuthHydration();
  const user = useAuthStore((s) => s.user);
  const adminSession = useImpersonationStore((s) => s.adminSession);

  useEffect(() => {
    if (!isReady) return;

    if (isViewingAsImpersonatedUser(adminSession, user?.id)) {
      router.replace("/dashboard");
      return;
    }

    if (isAuthenticated && isStaffRole(user?.role)) {
      router.replace(ADMIN_PANEL_PATH);
      return;
    }

    if (!isAuthenticated) {
      stashAuthNext(ADMIN_PANEL_PATH);
      router.replace(`/login?next=${encodeURIComponent(ADMIN_PANEL_PATH)}`);
    }
  }, [isReady, isAuthenticated, user?.id, user?.role, adminSession, router]);

  if (isReady && isAuthenticated && !isStaffRole(user?.role)) {
    notFound();
  }

  return (
    <div className="text-on-surface-variant flex min-h-screen items-center justify-center px-4 py-12">
      {t("checking")}
    </div>
  );
}
