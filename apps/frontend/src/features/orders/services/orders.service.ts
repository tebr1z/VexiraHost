import { apiClient } from "@/services/api-client";

export interface Order {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    metadata?: unknown;
  }[];
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    dueDate: string;
  } | null;
  hostingAccounts: {
    id: string;
    primaryDomain: string;
    status: string;
    panelUrl: string | null;
    provisionedAt: string | null;
    provisionStage: string | null;
    provisionError: string | null;
  }[];
  createdAt: string;
}

export async function listOrders(): Promise<Order[]> {
  const res = await apiClient.request<Order[]>("/orders");
  return res.data ?? [];
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiClient.request<Order>(`/orders/${id}`);
  return res.data as Order;
}
