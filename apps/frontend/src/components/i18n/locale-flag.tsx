import Image from "next/image";

import type { AppLocale } from "@/i18n/routing";
import { flagUrl } from "@/lib/i18n/locale-flags";
import { cn } from "@/lib/cn";

export function LocaleFlag({
  locale,
  size = 20,
  className,
}: {
  locale: AppLocale;
  size?: number;
  className?: string;
}): React.ReactElement {
  const width = size <= 16 ? 20 : size <= 20 ? 40 : 80;

  return (
    <Image
      src={flagUrl(locale, width)}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 0.75)}
      className={cn("rounded-sm object-cover shadow-sm ring-1 ring-black/5", className)}
      unoptimized
    />
  );
}
