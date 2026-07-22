import { apiClient } from "@/services/api-client";

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gatewayRef: string | null;
  failureReason: string | null;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  };
  method: {
    id: string;
    label: string;
    brand: string | null;
    last4: string | null;
  } | null;
  createdAt: string;
}

export async function listAdminPayments(filters?: {
  status?: string;
  search?: string;
}): Promise<AdminPayment[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString();
  const res = await apiClient.request<AdminPayment[]>(`/admin/payments${query ? `?${query}` : ""}`);
  return res.data ?? [];
}
