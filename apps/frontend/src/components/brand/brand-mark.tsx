import Image from "next/image";

import { cn } from "@/lib/cn";

export function BrandMark({
  className,
  size = 36,
  tone = "default",
}: {
  className?: string;
  size?: number;
  tone?: "default" | "light";
}): React.ReactElement {
  return (
    <Image
      src="/brand/icon.svg"
      alt=""
      width={size}
      height={size}
      priority
      unoptimized
      className={cn(
        "vexira-brand-mark shrink-0",
        tone === "light" && "vexira-brand-mark-light",
        className,
      )}
      aria-hidden
    />
  );
}
