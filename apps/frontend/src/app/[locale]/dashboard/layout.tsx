import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <DashboardShell>{children}</DashboardShell>;
}
