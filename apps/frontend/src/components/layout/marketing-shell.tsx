import { Navbar } from "@/components/landing";
import { SiteFooter } from "@/components/layout/site-footer";
import { CursorGlow } from "@/components/ui/cursor-glow";

export function MarketingShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="apple-page relative min-h-screen">
      <CursorGlow />
      <Navbar />
      <main className="relative z-10 pt-[calc(4.25rem+env(safe-area-inset-top))]">{children}</main>
      <SiteFooter />
    </div>
  );
}
