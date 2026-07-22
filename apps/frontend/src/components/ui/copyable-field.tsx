"use client";

import { useState } from "react";

export function CopyableField({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-surface px-3 py-2 font-mono text-sm font-semibold text-primary">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-outline-variant px-3 text-sm font-medium hover:bg-surface"
        >
          <span className="material-symbols-outlined text-base">{copied ? "check" : "content_copy"}</span>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
