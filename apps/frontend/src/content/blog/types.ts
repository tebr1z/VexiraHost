export type BlogLocale = "az" | "tr" | "en" | "ru";

export type BlogCategoryId = "hosting" | "vps" | "whatsapp";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string };

export type BlogPostContent = {
  title: string;
  excerpt: string;
  readingMinutes: number;
  ctaLabel: string;
  body: BlogBlock[];
};

export type BlogPostMeta = {
  slug: string;
  category: BlogCategoryId;
  publishedAt: string;
  ctaHref: string;
};

export type BlogUiCopy = {
  title: string;
  subtitle: string;
  readingTime: string;
  backToBlog: string;
  allPosts: string;
  readMore: string;
  categories: Record<BlogCategoryId, string>;
  relatedTitle: string;
  empty: string;
};
