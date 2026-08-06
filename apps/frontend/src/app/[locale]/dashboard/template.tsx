"use client";

import { DashboardPageTransition } from "@/components/dashboard/dashboard-page-transition";

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <DashboardPageTransition>{children}</DashboardPageTransition>;
}
