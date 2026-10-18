import { Navbar } from "@/components/landing";
import { AccessGate } from "@/components/layout/access-gate";
import { SiteFooter } from "@/components/layout/site-footer";

export function MarketingShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "home";
}): React.ReactElement {
  return (
    <div
      className={`apple-page public-marketing relative min-h-screen${variant === "home" ? "home-marketing" : ""}`}
    >
      <Navbar />
      <main className="relative z-10 pt-[calc(4.25rem+env(safe-area-inset-top))]">
        <AccessGate>{children}</AccessGate>
      </main>
      <SiteFooter />
    </div>
  );
}
