"use client";

import { ErrorShellView } from "@/components/errors/error-shell-view";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols is an icon font and must also load when the root layout fails. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; }
          .font-jakarta { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        `}</style>
      </head>
      <body>
        <ErrorShellView
          variant="500"
          showThemeToggle={false}
          content={{
            code: "500",
            title: "Critical error",
            headline: "The application failed to load",
            description:
              "A critical failure prevented the page from rendering. Refresh the browser. If the issue persists, clear site data or contact support.",
            detailsLabel: "Technical details",
            digestLabel: "Reference",
          }}
          actions={[
            { label: "Refresh page", onClick: reset, primary: true },
            { href: "/", label: "Homepage" },
          ]}
          errorDigest={error.digest ?? error.message}
        />
      </body>
    </html>
  );
}
