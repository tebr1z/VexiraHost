import Image from "next/image";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { Link as LocaleLink } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  variant?: "full" | "icon";
  tone?: "default" | "light";
  href?: string;
  /** Use next/link — safe outside NextIntl provider (error / global boundaries). */
  plainLink?: boolean;
  className?: string;
  labelClassName?: string;
  onClick?: () => void;
};

export function BrandLogo({
  variant = "full",
  tone = "default",
  href = "/",
  plainLink = false,
  className,
  labelClassName,
  onClick,
}: BrandLogoProps): React.ReactElement {
  const isIconOnly = variant === "icon";
  const isLight = tone === "light";

  const content = isIconOnly ? (
    <BrandMark size={32} tone={tone} />
  ) : (
    <span
      className={cn(
        "vexira-brand-logo block",
        isLight && "vexira-brand-logo-light",
        labelClassName,
      )}
    >
      <Image
        src="/brand/logo.svg"
        alt="Vexira Host"
        width={148}
        height={40}
        unoptimized
        className="vexira-brand-logo-default h-10 w-[148px]"
      />
      <Image
        src="/brand/logo-light.svg"
        alt="Vexira Host"
        width={148}
        height={40}
        unoptimized
        className="vexira-brand-logo-inverse h-10 w-[148px]"
      />
    </span>
  );

  const wrapperClass = cn("group inline-flex shrink-0 items-center gap-2.5", className);

  if (href) {
    if (plainLink) {
      return (
        <Link href={href} onClick={onClick} className={wrapperClass} aria-label="Vexira Host">
          {content}
        </Link>
      );
    }
    return (
      <LocaleLink href={href} onClick={onClick} className={wrapperClass} aria-label="Vexira Host">
        {content}
      </LocaleLink>
    );
  }

  return <span className={wrapperClass}>{content}</span>;
}
