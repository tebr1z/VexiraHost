import type { AuthSession } from "@vexira/types";
import { apiClient } from "@/services/api-client";

export interface AdminDashboardStats {
  activeUsers: number;
  totalOrders: number;
  openInvoices: number;
  openTickets: number;
  totalRevenue: number;
}

export interface AdminRecentOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  customerEmail: string;
  createdAt: string;
}

export interface AdminRecentTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customerEmail: string;
  updatedAt: string;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  recentOrders: AdminRecentOrder[];
  recentTickets: AdminRecentTicket[];
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AdminUser extends AdminCustomer {
  role: string;
  status: string;
  emailVerified: boolean;
  preferredCurrency: string | null;
  billingPeriod: string | null;
  currencyChangedAt: string | null;
  currencyLocked: boolean;
  orderCount: number;
  ticketCount: number;
  invoiceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAdminUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  preferredCurrency?: string;
  billingPeriod?: string;
  currencyLocked?: boolean;
  emailVerified?: boolean;
  password?: string;
}

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata: unknown;
}

export interface AdminOrder {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  customer: AdminCustomer;
  items: AdminOrderItem[];
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetail extends Omit<AdminOrder, "invoice"> {
  invoices: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    dueDate: string;
    paidAt: string | null;
  }[];
  hostingAccounts: AdminHostingAccountSummary[];
}

export interface AdminHostingAccountSummary {
  id: string;
  primaryDomain: string;
  status: string;
  panelUrl: string | null;
  provisionedAt: string | null;
}

export interface AdminOrdersFilter {
  status?: string;
  search?: string;
}

export interface AdminInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  dueDate: string;
  paidAt: string | null;
  customer: AdminCustomer;
  orderId: string | null;
  orderStatus: string | null;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messageCount: number;
  customer: AdminCustomer;
  createdAt: string;
  updatedAt: string;
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const res = await apiClient.request<AdminDashboardResponse>("/admin/dashboard");
  return res.data as AdminDashboardResponse;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await apiClient.request<AdminUser[]>("/admin/users");
  return res.data ?? [];
}

export async function getAdminUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.request<AdminUser>(`/admin/users/${userId}`);
  return res.data as AdminUser;
}

export async function updateAdminUser(
  userId: string,
  body: UpdateAdminUserInput,
): Promise<AdminUser> {
  const res = await apiClient.request<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body,
  });
  return res.data as AdminUser;
}

export async function impersonateAdminUser(userId: string): Promise<AuthSession> {
  const res = await apiClient.request<AuthSession>(`/admin/users/${userId}/impersonate`, {
    method: "POST",
  });
  return res.data as AuthSession;
}

export async function listAdminOrders(filters?: AdminOrdersFilter): Promise<AdminOrder[]> {
  const res = await apiClient.request<AdminOrder[]>("/admin/orders", {
    params: filters as Record<string, string | undefined>,
  });
  return res.data ?? [];
}

export async function updateAdminUserRole(userId: string, role: string): Promise<AdminUser> {
  const res = await apiClient.request<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: { role },
  });
  return res.data as AdminUser;
}

export async function updateAdminUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<AdminUser> {
  const res = await apiClient.request<AdminUser>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });
  return res.data as AdminUser;
}

export async function fulfillAdminOrder(
  id: string,
  options?: { alreadyDeployed?: boolean },
): Promise<AdminOrderDetail> {
  const res = await apiClient.request<AdminOrderDetail>(`/admin/orders/${id}/fulfill`, {
    method: "POST",
    body: {
      alreadyDeployed: options?.alreadyDeployed === true,
    },
  });
  return res.data as AdminOrderDetail;
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  const res = await apiClient.request<AdminOrderDetail>(`/admin/orders/${id}`);
  return res.data as AdminOrderDetail;
}

export async function listAdminInvoices(): Promise<AdminInvoice[]> {
  const res = await apiClient.request<AdminInvoice[]>("/admin/invoices");
  return res.data ?? [];
}

export async function listAdminTickets(): Promise<AdminTicket[]> {
  const res = await apiClient.request<AdminTicket[]>("/admin/tickets");
  return res.data ?? [];
}

export async function updateAdminTicketStatus(
  id: string,
  status: string,
): Promise<{ id: string; status: string }> {
  const res = await apiClient.request<{ id: string; status: string }>(`/admin/tickets/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  return res.data as { id: string; status: string };
}
