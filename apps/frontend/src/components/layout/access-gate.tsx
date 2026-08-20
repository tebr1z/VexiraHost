"use client";

import { useLocale } from "next-intl";

import { AccessClosedNotice } from "@/components/layout/access-closed-notice";
import { usePathname } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/is-staff-role";
import { pickLocalizedText } from "@/lib/localized-text";
import { matchAccessSection } from "@/lib/site-access";
import { useAuthStore } from "@/stores/auth-store";
import { useMaintenanceStore } from "@/stores/maintenance-store";

export function AccessGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const locale = useLocale();
  const role = useAuthStore((s) => s.user?.role);
  const access = useMaintenanceStore((s) => s.access);
  const section = matchAccessSection(pathname);

  if (!section || isStaffRole(role) || !access.sections[section]?.blocked) {
    return <>{children}</>;
  }

  return (
    <AccessClosedNotice message={pickLocalizedText(access.sections[section].message, locale)} />
  );
}
