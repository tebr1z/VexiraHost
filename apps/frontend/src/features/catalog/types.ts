export interface CatalogProductPrice {
  currency: string;
  period: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  hostingPlanSlug?: string | null;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  currency: string;
  billingCycle: string;
  period?: string;
  yearlySavingsPercent?: number | null;
  prices?: CatalogProductPrice[];
}

export interface CatalogCategory {
  id: string;
  productCount: number;
}
