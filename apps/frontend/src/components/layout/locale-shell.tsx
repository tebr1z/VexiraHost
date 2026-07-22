"use client";

import { ClientErrorBoundary } from "@/components/errors/client-error-boundary";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { NavigationProgressListener } from "@/components/layout/navigation-progress-listener";
import { PricingBootstrap } from "@/components/layout/pricing-bootstrap";

export function LocaleShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ClientErrorBoundary>
      <PricingBootstrap>
        <NavigationProgressListener />
        <NavigationProgress />
        <ImpersonationBanner />
        <MaintenanceGate>{children}</MaintenanceGate>
      </PricingBootstrap>
    </ClientErrorBoundary>
  );
}
