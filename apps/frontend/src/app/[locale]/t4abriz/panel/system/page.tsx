"use client";

import { AdminSystemSettings } from "@/components/admin/admin-system-settings";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminSystemPage(): React.ReactElement | null {
  useRequireAuth();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  return <AdminSystemSettings isAdmin={isAdmin} />;
}
