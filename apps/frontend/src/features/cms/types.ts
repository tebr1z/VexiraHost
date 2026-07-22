export type CmsSectionType =
  | "HERO"
  | "PLANS"
  | "INCLUDED"
  | "FEATURES"
  | "FAQ"
  | "CTA"
  | "STATS"
  | "RICH_TEXT"
  | "BANNER"
  | "CUSTOM";

export type I18nText = {
  tr: string;
  en?: string;
  ru?: string;
  az?: string;
};

export type CmsDesign = {
  variant?: string;
  layout?: "default" | "reverse" | "center" | "full" | "alternating" | "left" | "right";
  className?: string;
  background?: string;
  backgroundImage?: string;
  padding?: "sm" | "md" | "lg" | "xl";
  icon?: string;
  imageUrl?: string;
  accentColor?: string;
  columns?: number;
};

export interface PublicCmsSection {
  id: string;
  key: string;
  type: CmsSectionType;
  content: Record<string, unknown>;
  design: CmsDesign;
}

export interface PublicCmsPage {
  slug: string;
  title: string;
  sections: PublicCmsSection[];
}

export interface AdminCmsSection {
  id: string;
  pageId: string;
  key: string;
  type: CmsSectionType;
  sortOrder: number;
  isActive: boolean;
  content: Record<string, unknown>;
  design: CmsDesign;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCmsPage {
  id: string;
  slug: string;
  title: I18nText;
  isActive: boolean;
  sections: AdminCmsSection[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminCmsPageSummary {
  id: string;
  slug: string;
  title: I18nText;
  isActive: boolean;
  sectionCount: number;
  createdAt: string;
  updatedAt: string;
}
