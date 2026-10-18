import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export const formControlClassName = "app-field";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <label className={cn("app-field-group", className)}>
      <span className="app-field-label">
        {label}
        {required ? (
          <span aria-hidden="true" className="app-field-required">
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? <span className="app-field-error">{error}</span> : null}
      {!error && hint ? <span className="app-field-hint">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(formControlClassName, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(formControlClassName, "app-select", className)} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(formControlClassName, "app-textarea", className)}
        {...props}
      />
    );
  },
);
