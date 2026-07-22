import { apiClient } from "@/services/api-client";

import type { NavLabels } from "@/features/navigation/services/navigation.service";

export type { NavLabels };

export interface AdminNavItem {
  id: string;
  groupId: string;
  labels: NavLabels;
  href: string;
  pathMatch: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNavGroup {
  id: string;
  key: string;
  labels: NavLabels;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: AdminNavItem[];
}

export interface CreateNavGroupInput {
  key: string;
  labels: NavLabels;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateNavGroupInput {
  key?: string;
  labels?: NavLabels;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateNavItemInput {
  labels: NavLabels;
  href: string;
  pathMatch?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateNavItemInput {
  labels?: NavLabels;
  href?: string;
  pathMatch?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listAdminNavigation(): Promise<AdminNavGroup[]> {
  const res = await apiClient.request<AdminNavGroup[]>("/admin/navigation");
  return res.data ?? [];
}

export async function createAdminNavGroup(input: CreateNavGroupInput): Promise<AdminNavGroup> {
  const res = await apiClient.request<AdminNavGroup>("/admin/navigation/groups", {
    method: "POST",
    body: input,
  });
  return res.data as AdminNavGroup;
}

export async function updateAdminNavGroup(
  id: string,
  input: UpdateNavGroupInput,
): Promise<AdminNavGroup> {
  const res = await apiClient.request<AdminNavGroup>(`/admin/navigation/groups/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminNavGroup;
}

export async function deleteAdminNavGroup(id: string): Promise<void> {
  await apiClient.request(`/admin/navigation/groups/${id}`, { method: "DELETE" });
}

export async function createAdminNavItem(
  groupId: string,
  input: CreateNavItemInput,
): Promise<AdminNavItem> {
  const res = await apiClient.request<AdminNavItem>(`/admin/navigation/groups/${groupId}/items`, {
    method: "POST",
    body: input,
  });
  return res.data as AdminNavItem;
}

export async function updateAdminNavItem(
  id: string,
  input: UpdateNavItemInput,
): Promise<AdminNavItem> {
  const res = await apiClient.request<AdminNavItem>(`/admin/navigation/items/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminNavItem;
}

export async function deleteAdminNavItem(id: string): Promise<void> {
  await apiClient.request(`/admin/navigation/items/${id}`, { method: "DELETE" });
}
