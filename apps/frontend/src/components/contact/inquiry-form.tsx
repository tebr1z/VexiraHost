"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";
import { getApiErrorMessage } from "@/lib/api-error";
import { apiClient } from "@/services/api-client";
import { useMaintenanceStore } from "@/stores/maintenance-store";

export function InquiryForm({ kind }: { kind: "contact" | "support" }): React.ReactElement {
  const t = useTranslations("inquiry");
  const ta = useTranslations("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstile = useMaintenanceStore((s) => s.turnstile);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await apiClient.request("/contact", {
        method: "POST",
        body: {
          kind,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
          turnstileToken: turnstileToken || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(
        getApiErrorMessage(err, t("failed"), {
          turnstileFailed: ta("turnstileFailed"),
        }),
      );
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  if (done) {
    return (
      <div className="card-3d rounded-3xl p-6 sm:p-8">
        <h2 className="font-jakarta text-primary text-2xl font-bold">{t("successTitle")}</h2>
        <p className="text-on-surface-variant mt-3 text-sm">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-3d space-y-4 rounded-3xl p-6 sm:p-8">
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="inquiry-name">
          {t("name")}
        </label>
        <input
          id="inquiry-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          className="border-outline-variant bg-surface-container-lowest h-12 w-full rounded-xl border px-4 text-sm"
          autoComplete="name"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="inquiry-email">
          {t("email")}
        </label>
        <input
          id="inquiry-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-outline-variant bg-surface-container-lowest h-12 w-full rounded-xl border px-4 text-sm"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="inquiry-subject">
          {t("subject")}
        </label>
        <input
          id="inquiry-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border-outline-variant bg-surface-container-lowest h-12 w-full rounded-xl border px-4 text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="inquiry-message">
          {t("message")}
        </label>
        <textarea
          id="inquiry-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          rows={6}
          className="border-outline-variant bg-surface-container-lowest w-full rounded-xl border px-4 py-3 text-sm"
        />
      </div>

      {error ? (
        <div className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <TurnstileWidget ref={turnstileRef} action={kind} onToken={setTurnstileToken} />

      <button
        type="submit"
        disabled={loading || !turnstile.ready || (turnstile.enabled && !turnstileToken)}
        className="bg-primary text-on-primary h-12 w-full rounded-xl font-semibold disabled:opacity-60"
      >
        {loading ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
