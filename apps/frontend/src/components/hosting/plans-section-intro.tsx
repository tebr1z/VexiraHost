"use client";

import { HomeIcon } from "@/components/landing/home-icon";
import { cn } from "@/lib/cn";

export function PlansSectionIntro({
  eyebrow,
  title,
  subtitle,
  guarantees = [],
  controls,
  className,
  variant = "centered",
  headingLevel = 2,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  guarantees?: string[];
  controls?: React.ReactNode;
  className?: string;
  variant?: "centered" | "showcase";
  headingLevel?: 1 | 2;
}): React.ReactElement {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "vexira-plans-intro",
        variant === "showcase" && "vexira-plans-intro-showcase",
        className,
      )}
    >
      <div className="vexira-plans-heading">
        <div>
          {eyebrow ? <p className="home-eyebrow">{eyebrow}</p> : null}
          <Heading>{title}</Heading>
          {subtitle ? <p className="vexira-plans-subtitle">{subtitle}</p> : null}
        </div>
        {controls ? <div className="vexira-plans-controls">{controls}</div> : null}
      </div>
      {guarantees.length ? (
        <ul className="vexira-plans-guarantees">
          {guarantees.map((item) => (
            <li key={item}>
              <HomeIcon name="check" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
