"use client";

import { useId } from "react";

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
  const uid = useId().replace(/:/g, "");
  const isLight = tone === "light";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={isLight ? "#7ecbff" : "#5ac8fa"} />
          <stop offset="0.45" stopColor="var(--accent)" />
          <stop offset="1" stopColor={isLight ? "#c77dff" : "#af52de"} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="8" y1="6" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity={isLight ? "0.55" : "0.42"} />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill={`url(#${uid}-bg)`} />
      <rect width="36" height="36" rx="10" fill={`url(#${uid}-shine)`} />
      <path
        d="M11 23.5V14.5C11 13.12 12.12 12 13.5 12H22.5C23.88 12 25 13.12 25 14.5V23.5"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.5 23.5H26.5C27.33 23.5 28 24.17 28 25V25.5C28 26.33 27.33 27 26.5 27H9.5C8.67 27 8 26.33 8 25.5V25C8 24.17 8.67 23.5 9.5 23.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="14" cy="17.5" r="1.25" fill="white" fillOpacity="0.9" />
      <circle cx="18" cy="17.5" r="1.25" fill="white" fillOpacity="0.9" />
      <circle cx="22" cy="17.5" r="1.25" fill="white" fillOpacity="0.9" />
    </svg>
  );
}
