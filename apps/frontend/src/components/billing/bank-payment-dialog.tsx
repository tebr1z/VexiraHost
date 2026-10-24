"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getKapitalPaymentStatus } from "@/features/billing";
import {
  isBankReturnMessage,
  type BankPaymentSession,
  type BankPaymentOutcome,
} from "@/lib/bank-payment";

export function BankPaymentDialog({
  session,
  onFinish,
}: {
  session: BankPaymentSession;
  onFinish: (outcome: BankPaymentOutcome) => void;
}) {
  const t = useTranslations("bankPayment");
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const inFlight = useRef(false);
  const active = useRef(false);
  const terminal = useRef(false);
  const started = useRef(Date.now());
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const [paused, setPaused] = useState(false);

  const check = useCallback(async () => {
    if (inFlight.current || terminal.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const value = await getKapitalPaymentStatus(session.paymentId);
      if (!active.current) return;
      if (value.invoiceId !== session.invoiceId) throw new Error("Payment invoice mismatch");
      setCheckFailed(Boolean(value.verificationUnavailable));
      if (value.state === "paid") {
        terminal.current = true;
        onFinish("paid");
      } else if (value.state === "failed") {
        terminal.current = true;
        setFailed(true);
      }
    } catch {
      if (active.current) setCheckFailed(true);
    } finally {
      inFlight.current = false;
      if (active.current) setChecking(false);
    }
  }, [session.paymentId, session.invoiceId, onFinish]);
  useEffect(() => {
    active.current = true;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    void check();
    const timer = window.setInterval(() => {
      if (Date.now() - started.current > 10 * 60 * 1000) {
        setPaused(true);
        window.clearInterval(timer);
        return;
      }
      if (document.visibilityState === "visible") void check();
    }, 5000);
    const delay = window.setTimeout(() => setDelayed(true), 10000);
    const returned = (event: MessageEvent) => {
      if (isBankReturnMessage(event, window.location.origin, frame.current?.contentWindow))
        void check();
    };
    const focus = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("message", returned);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      window.clearTimeout(delay);
      window.removeEventListener("message", returned);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      element?.close();
    };
  }, [check]);

  return createPortal(
    <dialog
      ref={dialog}
      className="bank-payment-dialog"
      aria-labelledby="bank-payment-title"
      aria-describedby="bank-payment-privacy"
      onCancel={(event) => {
        event.preventDefault();
        onFinish(failed ? "failed" : "closed");
      }}
    >
      <header className="bank-payment-header">
        <div>
          <span className="bank-payment-eyebrow">VEXIRA HOST · KAPITAL BANK</span>
          <h2 id="bank-payment-title">{t("title")}</h2>
        </div>
        <button
          type="button"
          className="bank-payment-close"
          aria-label={t("close")}
          onClick={() => onFinish(failed ? "failed" : "closed")}
        >
          ×
        </button>
      </header>
      <div className="bank-payment-privacy" id="bank-payment-privacy">
        <span aria-hidden="true">↗</span>
        <p>{t("privacy")}</p>
      </div>
      <div className="bank-payment-fallback">
        <p>{delayed ? t("blocked") : t("loadingHint")}</p>
        <a
          href={session.url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          {t("openBank")} ↗
        </a>
      </div>
      <iframe
        ref={frame}
        src={session.url}
        title={t("frameTitle")}
        className="bank-payment-frame"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      />
      <footer className="bank-payment-footer">
        <div role="status" aria-live="polite">
          <strong>
            {failed
              ? t("failed")
              : checkFailed
                ? t("checkFailed")
                : paused
                  ? t("paused")
                  : t("waiting")}
          </strong>
          <p>{t("closeHint")}</p>
        </div>
        <button
          type="button"
          onClick={failed ? () => onFinish("failed") : () => void check()}
          disabled={checking}
        >
          {failed ? t("returnInvoice") : checking ? t("checking") : t("check")}
        </button>
      </footer>
    </dialog>,
    document.body,
  );
}
