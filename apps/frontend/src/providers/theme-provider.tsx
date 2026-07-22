"use client";

import { useEffect } from "react";

import { applyThemeClass, resolveTheme, useThemeStore } from "@/stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const mode = useThemeStore((s) => s.mode);
  const setResolved = useThemeStore((s) => s.setResolved);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode);
      setResolved(resolved);
      applyThemeClass(resolved);
    };

    apply();

    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, setResolved]);

  return <>{children}</>;
}
