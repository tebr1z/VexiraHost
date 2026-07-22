"use client";

import { useTranslations } from "next-intl";

import { ErrorShellView, type ErrorAction, type ErrorShellVariant } from "./error-shell-view";

export function ErrorShell({
  variant,
  namespace,
  actions,
  onRetry,
  errorDigest,
  className,
}: {
  variant: ErrorShellVariant;
  namespace: "notFound" | "forbidden" | "server" | "boundary" | "global";
  actions?: ErrorAction[];
  onRetry?: () => void;
  errorDigest?: string;
  className?: string;
}): React.ReactElement {
  const t = useTranslations(`errors.${namespace}`);

  const hints =
    namespace === "notFound" || namespace === "forbidden"
      ? [t("hint1"), t("hint2"), t("hint3")]
      : undefined;

  const defaultActions: ErrorAction[] = actions ?? [
    { href: "/", label: t("home"), primary: true },
    { href: "/dashboard", label: t("dashboard") },
  ];

  const shouldAddRetry =
    onRetry &&
    (namespace === "server" || namespace === "boundary" || namespace === "global") &&
    !defaultActions.some((action) => action.onClick);

  if (shouldAddRetry) {
    defaultActions.unshift({ label: t("retry"), onClick: onRetry, primary: true });
  }

  let code: string | undefined;
  if (namespace === "notFound" || namespace === "forbidden" || namespace === "server") {
    code = t("code");
  }

  return (
    <ErrorShellView
      variant={variant}
      className={className}
      errorDigest={errorDigest}
      content={{
        code,
        title: t("title"),
        headline: t("headline"),
        description: t("description"),
        hints,
        detailsLabel: namespace === "server" || namespace === "global" ? t("details") : undefined,
        digestLabel: namespace === "server" ? t("digest") : undefined,
      }}
      actions={defaultActions}
    />
  );
}
