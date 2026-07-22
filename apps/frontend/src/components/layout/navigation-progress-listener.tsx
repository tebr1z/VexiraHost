"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "@/i18n/navigation";
import { useNavigationProgressStore } from "@/stores/navigation-progress-store";

function shouldStartNavigation(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

  if (href.startsWith("#")) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  const samePath = url.pathname === current.pathname;
  const sameSearch = url.search === current.search;

  if (samePath && sameSearch && url.hash) return false;
  if (samePath && sameSearch && !url.hash) return false;

  return true;
}

export function NavigationProgressListener(): null {
  const pathname = usePathname();
  const start = useNavigationProgressStore((s) => s.start);
  const complete = useNavigationProgressStore((s) => s.complete);
  const previousPath = useRef(pathname);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor || !shouldStartNavigation(anchor)) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      complete();
      previousPath.current = pathname;
    }
  }, [pathname, complete]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) complete();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [complete]);

  return null;
}
