import { getLocale, getTranslations } from "next-intl/server";

import { FaqAccordion } from "@/components/faq/faq-accordion";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Link } from "@/i18n/navigation";
import { FAQ_CONTENT, type FaqLocale } from "@/content/faq";

export default async function FaqPage(): Promise<React.ReactElement> {
  const locale = await getLocale();
  const t = await getTranslations("faqPage");
  const content = FAQ_CONTENT[(locale in FAQ_CONTENT ? locale : "en") as FaqLocale];

  return (
    <MarketingShell>
      <section className="apple-page py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 text-lg text-[var(--label-secondary)]">{content.subtitle}</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
              {content.intro}
            </p>
          </div>

          <FaqAccordion categories={content.categories} />

          <div className="mt-12 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 text-center sm:p-8">
            <p className="text-sm text-[var(--label-secondary)] sm:text-[15px]">{t("contactNote")}</p>
            <Link
              href={content.contactLink}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              {content.contactCta}
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
