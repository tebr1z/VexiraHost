"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  label: string;
  error?: string;
  icon?: string;
  hint?: ReactNode;
  passwordToggle?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  className?: string;
  inputClassName?: string;
};

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  {
    label,
    error,
    icon,
    hint,
    passwordToggle = false,
    showPasswordLabel = "Show password",
    hidePasswordLabel = "Hide password",
    type = "text",
    className,
    inputClassName,
    disabled,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const id = props.name ? `auth-${props.name}` : autoId;
  const [revealed, setRevealed] = useState(false);
  const inputType = passwordToggle ? (revealed ? "text" : "password") : type;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "auth-field group relative rounded-2xl transition",
          error && "auth-field-error",
          disabled && "opacity-60",
        )}
        data-icon={icon ? "true" : "false"}
        data-password={passwordToggle ? "true" : "false"}
      >
        {icon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--label-tertiary)] transition group-focus-within:text-[var(--accent)]">
            <MaterialIcon name={icon} className="text-[20px]" />
          </span>
        ) : null}

        <input
          {...props}
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          placeholder=" "
          className={cn("auth-field-input peer", inputClassName)}
        />

        <label htmlFor={id} className="auth-field-label">
          {label}
        </label>

        {passwordToggle ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={revealed ? hidePasswordLabel : showPasswordLabel}
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-2.5 top-1/2 z-[1] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--label-tertiary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]"
          >
            <MaterialIcon
              name={revealed ? "visibility_off" : "visibility"}
              className="text-[20px]"
            />
          </button>
        ) : null}
      </div>

      {error ? <p className="text-error px-1 text-sm">{error}</p> : null}
      {!error && hint ? <div className="text-on-surface-variant px-1 text-xs">{hint}</div> : null}
    </div>
  );
});
