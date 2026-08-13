"use client";

import { useTranslations } from "next-intl";

import { ErrorShell } from "@/components/errors/error-shell";

/** Single public 404 template used everywhere (including staff-area gates). */
export function NotFoundView(): React.ReactElement {
  const t = useTranslations("errors.notFound");

  return (
    <ErrorShell
      variant="404"
      namespace="notFound"
      actions={[
        { href: "/", label: t("home"), primary: true },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/dashboard/tickets/new", label: t("support") },
      ]}
    />
  );
}
