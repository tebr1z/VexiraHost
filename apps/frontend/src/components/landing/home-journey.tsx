"use client";

import { useTranslations } from "next-intl";

import { HomeIcon, type HomeIconName } from "./home-icon";

const steps: Array<{ icon: HomeIconName; title: string; description: string }> = [
  { icon: "layers", title: "step1Title", description: "step1Description" },
  { icon: "sliders", title: "step2Title", description: "step2Description" },
  { icon: "bolt", title: "step3Title", description: "step3Description" },
];

export function HomeJourney(): React.ReactElement {
  const t = useTranslations("homeJourney");
  const th = useTranslations("homeRedesign");
  return (
    <section className="home-journey home-section" aria-labelledby="get-started-title">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">{t("eyebrow")}</p>
            <h2 id="get-started-title">{th("journeyTitle")}</h2>
            <p>{th("journeySubtitle")}</p>
          </div>
        </div>
        <ol className="home-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="home-step-top">
                <span className="home-step-number">0{index + 1}</span>
                <HomeIcon name={step.icon} />
              </div>
              <h3>{t(step.title)}</h3>
              <p>{t(step.description)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
