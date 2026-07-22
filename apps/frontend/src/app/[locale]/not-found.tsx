"use client";

import { useTranslations } from "next-intl";

import { ErrorShell } from "@/components/errors/error-shell";

export default function NotFoundPage(): React.ReactElement {
  const t = useTranslations("errors.notFound");

  return (
    <ErrorShell
      variant="404"
      namespace="notFound"
      actions={[
        { href: "/", label: t("home"), primary: true },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/t4abriz", label: t("admin") },
        { href: "/dashboard/tickets/new", label: t("support") },
      ]}
    />
  );
}
