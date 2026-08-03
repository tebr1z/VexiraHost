"use client";

import { useTranslations } from "next-intl";

interface DomainNameserversEditorProps {
  nameservers: string[];
  onChange: (nameservers: string[]) => void;
  translationScope: "dashboard" | "admin";
}

export function DomainNameserversEditor({
  nameservers,
  onChange,
  translationScope,
}: DomainNameserversEditorProps): React.ReactElement {
  const t = useTranslations(
    translationScope === "dashboard" ? "dashboard.pages.domains" : "admin.pages.users.domains",
  );

  const updateNameserver = (index: number, value: string) => {
    onChange(nameservers.map((ns, i) => (i === index ? value : ns)));
  };

  const addNameserver = () => {
    onChange([...nameservers, ""]);
  };

  const removeNameserver = (index: number) => {
    onChange(nameservers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border px-4 py-3">
        <h3 className="text-on-surface text-base font-semibold">{t("nameserversSection")}</h3>
        <p className="text-on-surface-variant mt-1.5 text-sm leading-relaxed">
          {t("nameserversHint")}
        </p>
      </div>

      <div className="space-y-3">
        {nameservers.map((ns, index) => (
          <div
            key={index}
            className="border-outline-variant/40 bg-surface flex flex-wrap items-end gap-3 rounded-xl border p-4"
          >
            <label className="min-w-[220px] flex-1 space-y-1.5">
              <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                {t("nameserverLabel", { index: index + 1 })}
              </span>
              <input
                type="text"
                value={ns}
                onChange={(e) => updateNameserver(index, e.target.value)}
                placeholder={`ns${index + 1}.vexirahost.com`}
                className="border-outline-variant/40 bg-surface-container-lowest w-full rounded-lg border px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => removeNameserver(index)}
              disabled={nameservers.length <= 2}
              className="border-outline-variant/50 text-on-surface-variant hover:border-error/40 hover:text-error h-10 rounded-lg border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("nsGlueDelete")}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addNameserver}
        className="text-secondary text-sm font-semibold hover:underline"
      >
        {t("addNameserver")}
      </button>
    </div>
  );
}

export const DEFAULT_NAMESERVERS = ["ns1.vexirahost.com", "ns2.vexirahost.com"];
