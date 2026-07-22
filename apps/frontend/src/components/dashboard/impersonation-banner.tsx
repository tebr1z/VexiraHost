"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { useAuthStore } from "@/stores/auth-store";
import {
  canReturnToAdmin,
  isViewingAsImpersonatedUser,
  useImpersonationStore,
} from "@/stores/impersonation-store";

export function ImpersonationBanner(): React.ReactElement | null {
  const t = useTranslations("admin.impersonation");
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const adminSession = useImpersonationStore((s) => s.adminSession);
  const impersonatedEmail = useImpersonationStore((s) => s.impersonatedEmail);

  const showBanner =
    canReturnToAdmin(adminSession) &&
    isViewingAsImpersonatedUser(adminSession, currentUser?.id) &&
    Boolean(impersonatedEmail);

  if (!showBanner) {
    return null;
  }

  const handleReturnToAdmin = () => {
    const restored = useImpersonationStore.getState().endImpersonation();
    if (!restored) {
      return;
    }
    setSession(restored.session, { rememberMe: restored.rememberMe });
    router.replace("/t4abriz/panel");
  };

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-500/40 bg-amber-500/15 px-4 py-2.5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-3 text-sm text-amber-950 dark:text-amber-100">
        <p className="font-medium">{t("viewingAs", { email: impersonatedEmail })}</p>
        <button
          type="button"
          onClick={handleReturnToAdmin}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
        >
          {t("returnToAdmin")}
        </button>
      </div>
    </div>
  );
}
