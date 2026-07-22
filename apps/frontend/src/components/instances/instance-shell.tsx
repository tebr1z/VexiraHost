"use client";

import { SiteFooter } from "@/components/layout/site-footer";

import { InstanceSidebar } from "./instance-sidebar";

export function InstanceShell({
  children,
  activeNav = "compute",
}: {
  children: React.ReactNode;
  activeNav?: "dashboard" | "compute" | "storage" | "network" | "billing" | "support";
}): React.ReactElement {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="flex min-w-0">
        <InstanceSidebar activeNav={activeNav} />
        <div className="min-w-0 flex-1 px-margin-mobile py-stack-md md:px-margin-desktop">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
