"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
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
      className={cn("brand-loader", fullPage && "brand-loader-full", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-symbol" aria-hidden>
        <BrandMark size={54} />
      </div>
      <div>
        <p className="brand-loader-name">Vexira Host</p>
        <p className="brand-loader-label">{t("navigating")}</p>
      </div>
      <div className="brand-loader-track" aria-hidden />
    </div>
  );
}

type CloudNavOverlayProps = {
  open: boolean;
};

export function CloudNavOverlay({ open }: CloudNavOverlayProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="brand-loader-overlay"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="brand-loader-dialog"
          >
            <CloudNavLoader />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
