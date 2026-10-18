"use client";

import { useTranslations } from "next-intl";

import { HomeIcon } from "./home-icon";

import { Link } from "@/i18n/navigation";

export function HomeFaqSection(): React.ReactElement {
  const t = useTranslations("homeRedesign");
  const faq = useTranslations("publicHosting.faq");
  return (
    <>
      <section className="home-faq home-section" aria-labelledby="home-faq-title">
        <div className="home-container home-faq-layout">
          <div>
            <p className="home-eyebrow">{t("faqEyebrow")}</p>
            <h2 id="home-faq-title">{t("faqTitle")}</h2>
            <Link href="/faq" className="home-text-link">
              {t("faqLink")}
              <HomeIcon name="arrow" />
            </Link>
          </div>
          <div className="home-faq-list">
            {["q1", "q2", "q3"].map((key) => (
              <details key={key}>
                <summary>
                  <span>{faq(`${key}.question`)}</span>
                  <HomeIcon name="plus" />
                </summary>
                <p>{faq(`${key}.answer`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="home-closing" id="solutions" aria-labelledby="home-closing-title">
        <div className="home-container">
          <div className="home-closing-inner">
            <div>
              <p className="home-eyebrow">VEXIRA HOST</p>
              <h2 id="home-closing-title">{t("ctaTitle")}</h2>
              <p>{t("ctaDescription")}</p>
            </div>
            <a href="#pricing" className="home-button home-button-primary">
              {t("ctaButton")}
              <HomeIcon name="arrow" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
