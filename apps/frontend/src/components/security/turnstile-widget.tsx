"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { useMaintenanceStore } from "@/stores/maintenance-store";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export type TurnstileAction =
  "login" | "signup" | "forgot-password" | "reset-password" | "contact" | "support";

export type TurnstileWidgetHandle = {
  getToken: () => string;
  reset: () => void;
};

type Props = {
  action: TurnstileAction;
  onToken?: (token: string) => void;
  className?: string;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(function TurnstileWidget(
  { action, onToken, className },
  ref,
) {
  const config = useMaintenanceStore((s) => s.turnstile);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef("");
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
    onTokenRef.current?.(token);
  }, []);

  const renderWidget = useCallback(() => {
    if (!config.enabled || !config.siteKey) return;
    if (!containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: config.siteKey,
      action,
      callback: (token: string) => setToken(token),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, [action, config.enabled, config.siteKey, setToken]);

  useImperativeHandle(ref, () => ({
    getToken: () => tokenRef.current,
    reset: () => {
      setToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      tokenRef.current = "";
    };
  }, [renderWidget]);

  if (!config.ready || !config.enabled || !config.siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div ref={containerRef} />
    </div>
  );
});
