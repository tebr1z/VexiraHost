export type FaqLocale = "tr" | "en" | "ru" | "az";

export type FaqItem = { id: string; question: string; answer: string };
export type FaqCategory = { id: string; title: string; items: FaqItem[] };
export type FaqPageContent = {
  title: string;
  subtitle: string;
  intro: string;
  contactCta: string;
  contactLink: string;
  categories: FaqCategory[];
};
