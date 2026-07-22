import type { CmsDesign } from "@/features/cms/types";
import { cn } from "@/lib/cn";

const PADDING: Record<string, string> = {
  sm: "py-8 sm:py-10",
  md: "py-12 sm:py-14",
  lg: "py-16 sm:py-20",
  xl: "py-20 sm:py-24",
};

export function CmsSectionShell({
  design,
  children,
  className,
  id,
}: {
  design?: CmsDesign;
  children: React.ReactNode;
  className?: string;
  id?: string;
}): React.ReactElement {
  const padding = PADDING[design?.padding ?? "md"] ?? PADDING.md;
  const style: React.CSSProperties & Record<string, string> = {};
  if (design?.backgroundImage) {
    style.backgroundImage = `url(${design.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  } else if (design?.background) {
    style.background = design.background;
  }
  if (design?.accentColor) {
    style["--accent"] = design.accentColor;
  }

  return (
    <div
      id={id}
      className={cn(
        padding,
        design?.variant === "gradient" && "relative overflow-hidden",
        design?.className,
        className,
      )}
      style={style}
      data-cms-variant={design?.variant}
    >
      {children}
    </div>
  );
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asBlocks(value: unknown): Array<{
  icon?: string;
  layout?: string;
  title?: string;
  description?: string;
  bullets?: string[];
}> {
  if (!Array.isArray(value)) return [];
  return value as Array<{
    icon?: string;
    layout?: string;
    title?: string;
    description?: string;
    bullets?: string[];
  }>;
}

export function asFaqItems(value: unknown): Array<{ question?: string; answer?: string }> {
  if (!Array.isArray(value)) return [];
  return value as Array<{ question?: string; answer?: string }>;
}
