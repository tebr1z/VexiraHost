import { BrandMark } from "@/components/brand/brand-mark";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  variant?: "full" | "icon";
  tone?: "default" | "light";
  href?: string;
  className?: string;
  labelClassName?: string;
  onClick?: () => void;
};

export function BrandLogo({
  variant = "full",
  tone = "default",
  href = "/",
  className,
  labelClassName,
  onClick,
}: BrandLogoProps): React.ReactElement {
  const isIconOnly = variant === "icon";
  const isLight = tone === "light";

  const content = (
    <>
      <BrandMark size={isIconOnly ? 32 : 36} tone={tone} />
      {!isIconOnly && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[1.05rem] font-bold tracking-tight",
              isLight ? "text-white" : "text-[var(--label)]",
              labelClassName,
            )}
          >
            Vexira
          </span>
          <span
            className={cn(
              "text-[0.6875rem] font-semibold uppercase tracking-[0.14em]",
              isLight ? "text-white/75" : "text-[var(--accent)]",
              labelClassName,
            )}
          >
            Host
          </span>
        </span>
      )}
    </>
  );

  const wrapperClass = cn("group inline-flex shrink-0 items-center gap-2.5", className);

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={wrapperClass} aria-label="Vexira Host">
        {content}
      </Link>
    );
  }

  return <span className={wrapperClass}>{content}</span>;
}
