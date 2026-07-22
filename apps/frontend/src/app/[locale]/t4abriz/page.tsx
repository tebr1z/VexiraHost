"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ADMIN_PANEL_PATH } from "@/components/admin/admin-nav-config";
import { useAuthStore } from "@/stores/auth-store";
import {
  isViewingAsImpersonatedUser,
  useImpersonationStore,
} from "@/stores/impersonation-store";

export default function AdminLoginPage(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const adminSession = useImpersonationStore((s) => s.adminSession);

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  useEffect(() => {
    if (isViewingAsImpersonatedUser(adminSession, user?.id)) {
      router.replace("/dashboard");
      return;
    }
    if (user && (user.role === "admin" || user.role === "staff")) {
      router.replace(ADMIN_PANEL_PATH);
    }
  }, [user, adminSession, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <AdminLoginForm />
    </div>
  );
}
