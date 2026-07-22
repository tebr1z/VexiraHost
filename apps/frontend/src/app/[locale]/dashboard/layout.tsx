import { DashboardShell } from "@/components/dashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <DashboardShell>{children}</DashboardShell>;
}
