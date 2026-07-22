"use client";

import type { PublicCmsSection } from "@/features/cms/types";

import { CmsCustomSection } from "./sections/cms-custom-section";
import { CmsFaqSection } from "./sections/cms-faq-section";
import { CmsFeaturesSection } from "./sections/cms-features-section";
import { CmsHeroSection } from "./sections/cms-hero-section";
import { CmsIncludedSection } from "./sections/cms-included-section";
import { CmsPlansSection } from "./sections/cms-plans-section";

export function CmsSectionRenderer({ section }: { section: PublicCmsSection }): React.ReactElement | null {
  switch (section.type) {
    case "HERO":
      return <CmsHeroSection section={section} />;
    case "PLANS":
      return <CmsPlansSection section={section} />;
    case "INCLUDED":
      return <CmsIncludedSection section={section} />;
    case "FEATURES":
      return <CmsFeaturesSection section={section} />;
    case "FAQ":
      return <CmsFaqSection section={section} />;
    case "CTA":
    case "STATS":
    case "RICH_TEXT":
    case "BANNER":
    case "CUSTOM":
      return <CmsCustomSection section={section} />;
    default:
      return null;
  }
}
