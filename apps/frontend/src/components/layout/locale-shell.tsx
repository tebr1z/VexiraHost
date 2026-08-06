"use client";

import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { ClientErrorBoundary } from "@/components/errors/client-error-boundary";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { NavigationProgressListener } from "@/components/layout/navigation-progress-listener";
import { PricingBootstrap } from "@/components/layout/pricing-bootstrap";
import { SiteAnnouncement } from "@/components/layout/site-announcement";

export function LocaleShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ClientErrorBoundary>
      <PricingBootstrap>
        <NavigationProgressListener />
        <NavigationProgress />
        <ImpersonationBanner />
        <SiteAnnouncement />
        <MaintenanceGate>{children}</MaintenanceGate>
      </PricingBootstrap>
    </ClientErrorBoundary>
  );
}
