"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ADMIN_PANEL_PATH } from "@/components/admin/admin-nav-config";
import { useVerifiedStaffSession } from "@/features/auth/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isViewingAsImpersonatedUser, useImpersonationStore } from "@/stores/impersonation-store";

/**
 * Hidden staff entry. Non-staff and anonymous visitors always get a generic 404 —
 * never 403 or login redirects that would reveal an admin surface.
 * Staff access is confirmed from /users/me, not persisted localStorage role.
 */
export default function AdminEntryPage(): React.ReactElement {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const { isReady, isStaff } = useVerifiedStaffSession();
  const user = useAuthStore((s) => s.user);
  const adminSession = useImpersonationStore((s) => s.adminSession);

  useEffect(() => {
    if (!isReady) return;

    if (isViewingAsImpersonatedUser(adminSession, user?.id)) {
      router.replace("/dashboard");
      return;
    }

    if (isStaff) {
      router.replace(ADMIN_PANEL_PATH);
    }
  }, [isReady, isStaff, user?.id, adminSession, router]);

  if (!isReady) {
    return (
      <div className="text-on-surface-variant flex min-h-screen items-center justify-center px-4 py-12">
        {t("checking")}
      </div>
    );
  }

  if (isViewingAsImpersonatedUser(adminSession, user?.id)) {
    return (
      <div className="text-on-surface-variant flex min-h-screen items-center justify-center px-4 py-12">
        {t("checking")}
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="text-on-surface-variant flex min-h-screen items-center justify-center px-4 py-12">
        {t("checking")}
      </div>
    );
  }

  notFound();
}
