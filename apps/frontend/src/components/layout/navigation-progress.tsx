"use client";

import { AnimatePresence, motion } from "framer-motion";

import { CloudNavOverlay } from "@/components/layout/cloud-nav-loader";
import { useNavigationProgressStore } from "@/stores/navigation-progress-store";

export function NavigationProgress(): React.ReactElement {
  const isActive = useNavigationProgressStore((s) => s.isActive);
  const showOverlay = useNavigationProgressStore((s) => s.showOverlay);
  const progress = useNavigationProgressStore((s) => s.progress);

  return (
    <>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed inset-x-0 top-0 z-[230]"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
            aria-hidden
          >
            <div className="h-[3px] w-full bg-[var(--fill-secondary)]">
              <motion.div
                className="nav-progress-bar h-full origin-left rounded-r-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(progress, 8) / 100 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ width: "100%" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CloudNavOverlay open={showOverlay} />
    </>
  );
}
