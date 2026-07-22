"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { ErrorShell } from "@/components/errors/error-shell";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  const t = useTranslations("errors.server");

  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <ErrorShell
      variant="500"
      namespace="server"
      onRetry={reset}
      errorDigest={error.digest ?? error.message}
      actions={[
        { href: "/", label: t("home") },
        { href: "/dashboard", label: t("dashboard") },
      ]}
    />
  );
}
