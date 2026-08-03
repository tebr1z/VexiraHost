"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition disabled:opacity-40 ${
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function normalizeEmpty(html: string): string {
  const cleaned = html.replace(/&nbsp;/g, " ").trim();
  if (!cleaned || cleaned === "<br>" || cleaned === "<div><br></div>") return "";
  if (cleaned === "<p><br></p>" || cleaned === "<p></p>") return "";
  return html;
}

export function CampaignRichEditor({
  value,
  onChange,
  disabled,
  placeholder = "Write your campaign message…",
}: Props): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (value === lastValue.current) return;
    el.innerHTML = value || "";
    lastValue.current = value;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.contentEditable = disabled ? "false" : "true";
  }, [disabled]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const html = normalizeEmpty(el.innerHTML);
    lastValue.current = html;
    onChange(html);
  };

  const run = (command: string, arg?: string) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const setLink = () => {
    if (disabled) return;
    const url = window.prompt("Link URL", "https://");
    if (url === null) return;
    if (!url.trim()) {
      run("unlink");
      return;
    }
    run("createLink", url.trim());
  };

  const isActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  return (
    <div
      className={`border-outline-variant bg-surface overflow-hidden rounded-xl border ${
        disabled ? "opacity-70" : ""
      }`}
    >
      <div className="border-outline-variant/60 bg-surface-container-low/60 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          icon="format_bold"
          active={isActive("bold")}
          disabled={disabled}
          onClick={() => run("bold")}
        />
        <ToolbarButton
          label="Italic"
          icon="format_italic"
          active={isActive("italic")}
          disabled={disabled}
          onClick={() => run("italic")}
        />
        <ToolbarButton
          label="Underline"
          icon="format_underlined"
          active={isActive("underline")}
          disabled={disabled}
          onClick={() => run("underline")}
        />
        <ToolbarButton
          label="Strike"
          icon="format_strikethrough"
          active={isActive("strikeThrough")}
          disabled={disabled}
          onClick={() => run("strikeThrough")}
        />
        <span className="bg-outline-variant/60 mx-1 h-5 w-px" />
        <ToolbarButton
          label="Heading"
          icon="title"
          disabled={disabled}
          onClick={() => run("formatBlock", "h2")}
        />
        <ToolbarButton
          label="Paragraph"
          icon="notes"
          disabled={disabled}
          onClick={() => run("formatBlock", "p")}
        />
        <ToolbarButton
          label="Bullet list"
          icon="format_list_bulleted"
          disabled={disabled}
          onClick={() => run("insertUnorderedList")}
        />
        <ToolbarButton
          label="Numbered list"
          icon="format_list_numbered"
          disabled={disabled}
          onClick={() => run("insertOrderedList")}
        />
        <span className="bg-outline-variant/60 mx-1 h-5 w-px" />
        <ToolbarButton label="Link" icon="link" disabled={disabled} onClick={setLink} />
        <ToolbarButton
          label="Remove link"
          icon="link_off"
          disabled={disabled}
          onClick={() => run("unlink")}
        />
        <ToolbarButton
          label="Clear formatting"
          icon="format_clear"
          disabled={disabled}
          onClick={() => run("removeFormat")}
        />
      </div>

      <div className="relative">
        {!value && (
          <p className="text-on-surface-variant/60 pointer-events-none absolute left-4 top-3 text-sm">
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          className="campaign-rich-editor max-h-[420px] min-h-[220px] overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none"
        />
      </div>

      <style>{`
        .campaign-rich-editor a { color: #0284c7; text-decoration: underline; }
        .campaign-rich-editor ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
        .campaign-rich-editor ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0; }
        .campaign-rich-editor h2 { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
        .campaign-rich-editor p { margin: 0.35rem 0; }
        .campaign-rich-editor b, .campaign-rich-editor strong { font-weight: 700; }
      `}</style>
    </div>
  );
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
