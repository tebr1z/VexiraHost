"use client";

import { useTranslations } from "next-intl";

import { ErrorShell } from "@/components/errors/error-shell";

export default function ForbiddenPage(): React.ReactElement {
  const t = useTranslations("errors.forbidden");

  return (
    <ErrorShell
      variant="403"
      namespace="forbidden"
      actions={[
        { href: "/", label: t("home"), primary: true },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/login", label: t("login") },
        { href: "/dashboard/tickets/new", label: t("contact") },
      ]}
    />
  );
}
