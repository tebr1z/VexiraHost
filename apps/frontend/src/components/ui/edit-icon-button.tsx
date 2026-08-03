import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function PencilIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-[1.125rem] w-[1.125rem]", className)}
    >
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L16.62 5.5a1.5 1.5 0 0 0-2.12 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-[1.125rem] w-[1.125rem]", className)}
    >
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

export function LoginIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-[1.125rem] w-[1.125rem]", className)}
    >
      <path
        d="M10 17v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v2"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12H3m0 0 3.5-3.5M3 12l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type IconBtnVariant = "default" | "edit" | "view" | "login";

const VARIANT_CLASS: Record<IconBtnVariant, string> = {
  default: "",
  edit: "icon-btn-3d-edit",
  view: "icon-btn-3d-view",
  login: "icon-btn-3d-login",
};

export function IconActionLink({
  href,
  label,
  variant = "default",
  showLabel = false,
  className,
  children,
}: {
  href: string;
  label: string;
  variant?: IconBtnVariant;
  showLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "icon-btn-3d group",
        VARIANT_CLASS[variant],
        showLabel && "icon-btn-3d-labeled",
        className,
      )}
    >
      <span className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
        {children}
      </span>
      {showLabel ? <span className="icon-btn-3d-label">{label}</span> : null}
    </Link>
  );
}

export function IconActionButton({
  label,
  variant = "default",
  showLabel = false,
  disabled,
  className,
  onClick,
  children,
}: {
  label: string;
  variant?: IconBtnVariant;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "icon-btn-3d group",
        VARIANT_CLASS[variant],
        showLabel && "icon-btn-3d-labeled",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
        {children}
      </span>
      {showLabel ? <span className="icon-btn-3d-label">{label}</span> : null}
    </button>
  );
}

export function EditIconLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <IconActionLink href={href} label={label} variant="edit" className={className}>
      <PencilIcon />
    </IconActionLink>
  );
}

export function TableRowActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn("table-row-actions", className)}>{children}</div>;
}
