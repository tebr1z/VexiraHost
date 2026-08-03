"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CampaignRichEditor, htmlToPlainText } from "./campaign-rich-editor";

export type CampaignFormValues = {
  subject: string;
  previewText: string;
  bodyHtml: string;
  bodyText: string;
};

const EMPTY: CampaignFormValues = {
  subject: "",
  previewText: "",
  bodyHtml: "",
  bodyText: "",
};

type Props = {
  initialValues?: Partial<CampaignFormValues>;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (values: CampaignFormValues) => Promise<void>;
};

export function CampaignForm({
  initialValues,
  submitLabel,
  disabled,
  onSubmit,
}: Props): React.ReactElement {
  const tp = useTranslations("admin.pages.campaigns");
  const [values, setValues] = useState<CampaignFormValues>({ ...EMPTY, ...initialValues });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CampaignFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const html = values.bodyHtml.trim();
    if (!html || html === "<p></p>") {
      setError(tp("bodyRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        bodyHtml: html,
        bodyText: values.bodyText.trim() || htmlToPlainText(html),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const field = "h-11 w-full rounded-xl border border-outline-variant px-4 text-sm";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="border-outline-variant/50 bg-surface space-y-4 rounded-2xl border p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">{tp("fieldSubject")}</label>
        <input
          value={values.subject}
          onChange={(e) => set("subject", e.target.value)}
          required
          disabled={disabled}
          className={field}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tp("fieldPreview")}</label>
        <input
          value={values.previewText}
          onChange={(e) => set("previewText", e.target.value)}
          disabled={disabled}
          className={field}
          placeholder={tp("fieldPreviewPlaceholder")}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tp("fieldBody")}</label>
        <p className="text-on-surface-variant mb-2 text-xs">{tp("fieldBodyHint")}</p>
        <CampaignRichEditor
          value={values.bodyHtml}
          onChange={(html) => set("bodyHtml", html)}
          disabled={disabled}
          placeholder={tp("fieldBodyPlaceholder")}
        />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || disabled}
        className="bg-primary text-on-primary inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "…" : submitLabel}
      </button>
    </form>
  );
}

export function toCampaignPayload(values: CampaignFormValues) {
  return {
    subject: values.subject.trim(),
    previewText: values.previewText.trim() || undefined,
    bodyHtml: values.bodyHtml,
    bodyText: values.bodyText.trim() || htmlToPlainText(values.bodyHtml) || undefined,
  };
}

export function campaignToFormValues(campaign: {
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  bodyText: string | null;
}): CampaignFormValues {
  return {
    subject: campaign.subject,
    previewText: campaign.previewText ?? "",
    bodyHtml: campaign.bodyHtml,
    bodyText: campaign.bodyText ?? "",
  };
}
