"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

export function usePrefetchRoutes(hrefs: readonly string[]): void {
  const router = useRouter();

  useEffect(() => {
    for (const href of hrefs) {
      router.prefetch(href);
    }
  }, [router, hrefs]);
}
