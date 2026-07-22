import type { FaqLocale, FaqPageContent } from "./types";
import { faqAz } from "./az";
import { faqEn } from "./en";
import { faqRu } from "./ru";
import { faqTr } from "./tr";

export type { FaqLocale, FaqPageContent, FaqCategory, FaqItem } from "./types";

export const FAQ_CONTENT: Record<FaqLocale, FaqPageContent> = {
  tr: faqTr,
  en: faqEn,
  ru: faqRu,
  az: faqAz,
};
