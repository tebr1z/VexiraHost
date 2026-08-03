import { apiClient } from "@/services/api-client";

export type PromoDiscountType = "PERCENT" | "FIXED";

export interface AdminPromoCode {
  id: string;
  code: string;
  type: PromoDiscountType;
  value: number;
  currency: string | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
  redemptionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminPromoCodeInput = {
  code: string;
  type: PromoDiscountType;
  value: number;
  currency?: string | null;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  maxPerUser?: number | null;
  isActive?: boolean;
  appliesToAll?: boolean;
  productIds?: string[];
  categories?: string[];
};

export async function listAdminPromoCodes(): Promise<AdminPromoCode[]> {
  const res = await apiClient.request<AdminPromoCode[]>("/admin/promo-codes");
  return res.data ?? [];
}

export async function getAdminPromoCode(id: string): Promise<AdminPromoCode> {
  const res = await apiClient.request<AdminPromoCode>(`/admin/promo-codes/${id}`);
  return res.data as AdminPromoCode;
}

export async function createAdminPromoCode(input: AdminPromoCodeInput): Promise<AdminPromoCode> {
  const res = await apiClient.request<AdminPromoCode>("/admin/promo-codes", {
    method: "POST",
    body: input,
  });
  return res.data as AdminPromoCode;
}

export async function updateAdminPromoCode(
  id: string,
  input: Partial<AdminPromoCodeInput>,
): Promise<AdminPromoCode> {
  const res = await apiClient.request<AdminPromoCode>(`/admin/promo-codes/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminPromoCode;
}

export async function deleteAdminPromoCode(id: string): Promise<void> {
  await apiClient.request(`/admin/promo-codes/${id}`, { method: "DELETE" });
}
