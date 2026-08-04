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
  catalogCategoryId?: string | null;
  hostingPlanSlug?: string | null;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  currency: string;
  billingCycle: string;
  period?: string;
  yearlySavingsPercent?: number | null;
  availableCurrencies?: string[];
  yearlyAvailable?: boolean;
  prices?: CatalogProductPrice[];
  isFree?: boolean;
  deliveryMode?: string;
  downloadFileName?: string | null;
  promoText?: string | null;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  systemType: string | null;
  productCount: number;
}
