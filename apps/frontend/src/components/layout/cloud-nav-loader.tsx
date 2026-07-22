"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/cn";

type CloudNavLoaderProps = {
  fullPage?: boolean;
  className?: string;
};

export function CloudNavLoader({
  fullPage = false,
  className,
}: CloudNavLoaderProps): React.ReactElement {
  const t = useTranslations("common");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage && "min-h-[50vh] w-full",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="nav-cloud-ring nav-cloud-ring-1 absolute inset-0 rounded-[22px]" />
        <span className="nav-cloud-ring nav-cloud-ring-2 absolute inset-1 rounded-[18px]" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-[16px] bg-[var(--bg-elevated)] shadow-apple-md ring-[0.5px] ring-[var(--separator)]">
          <Image
            src="/favicon.png"
            alt=""
            width={40}
            height={40}
            priority
            aria-hidden
            className="nav-cloud-icon h-9 w-9 object-contain"
          />
        </span>
      </div>

      <div className="w-44 overflow-hidden rounded-full bg-[var(--fill-secondary)]">
        <div className="nav-cloud-shimmer h-1.5 w-full rounded-full" />
      </div>

      <p className="text-sm font-medium tracking-tight text-[var(--label-secondary)]">
        {t("navigating")}
      </p>
    </div>
  );
}

type CloudNavOverlayProps = {
  open: boolean;
};

export function CloudNavOverlay({ open }: CloudNavOverlayProps): React.ReactElement {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[220] flex items-center justify-center bg-[var(--bg)]/55 px-6 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="w-full max-w-sm rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] px-8 py-10 shadow-apple-md"
          >
            <CloudNavLoader />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
