import { cn } from "@/lib/cn";

function LogoShell({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}): React.ReactElement {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg border border-[var(--separator)] bg-[var(--bg-elevated)] px-2.5 shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

function VisaLogo(): React.ReactElement {
  return (
    <LogoShell label="Visa">
      <svg viewBox="0 0 48 16" className="h-4 w-12" aria-hidden>
        <text
          x="0"
          y="13"
          fill="#1A1F71"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="14"
          fontStyle="italic"
          fontWeight="800"
          letterSpacing="-0.5"
        >
          VISA
        </text>
      </svg>
    </LogoShell>
  );
}

function MastercardLogo(): React.ReactElement {
  return (
    <LogoShell label="Mastercard">
      <svg viewBox="0 0 40 24" className="h-5 w-8" aria-hidden>
        <circle cx="15" cy="12" r="8" fill="#EB001B" />
        <circle cx="25" cy="12" r="8" fill="#F79E1B" />
        <path d="M20 5.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6Z" fill="#FF5F00" />
      </svg>
    </LogoShell>
  );
}

function AmexLogo(): React.ReactElement {
  return (
    <LogoShell label="American Express" className="border-[#2E77BC] bg-[#2E77BC]">
      <svg viewBox="0 0 56 16" className="h-3.5 w-14" aria-hidden>
        <text
          x="0"
          y="12.5"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
          fontWeight="800"
          letterSpacing="0.5"
        >
          AMEX
        </text>
      </svg>
    </LogoShell>
  );
}

function BankLogo(): React.ReactElement {
  return (
    <LogoShell label="Bank transfer">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-[var(--label-primary)]"
        fill="none"
        aria-hidden
      >
        <path
          d="M3 10.5 12 4l9 6.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 10.5V18h14v-7.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 20h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M9 14v4M12 14v4M15 14v4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--label-primary)]">
        Bank
      </span>
    </LogoShell>
  );
}

function B2BLogo(): React.ReactElement {
  return (
    <LogoShell label="B2B">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--accent)]" fill="none" aria-hidden>
        <rect x="3" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M7 11v2.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M8 19h8M10 15.5V19M14 15.5V19"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--label-primary)]">
        B2B
      </span>
    </LogoShell>
  );
}

function CryptoLogo(): React.ReactElement {
  return (
    <LogoShell label="Crypto">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="#F7931A" />
        <path
          d="M13.2 7.2h-1.1V6h-1.2v1.2H9.8V8.4h1.1v7.2H9.8v1.2h1.1V18h1.2v-1.2h1.1c1.7 0 2.9-.9 2.9-2.3 0-1-.5-1.7-1.4-2 .7-.3 1.2-1 1.2-1.9 0-1.3-1.1-2.2-2.7-2.2Zm-.2 7.2h-2V13h2c.8 0 1.3.4 1.3.9s-.5.9-1.3.9Zm0-3.2h-2V9.6h2c.7 0 1.2.3 1.2.8s-.5.8-1.2.8Z"
          fill="#fff"
        />
      </svg>
      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--label-primary)]">
        Crypto
      </span>
    </LogoShell>
  );
}

export function FooterPaymentLogos({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label="Accepted payment methods"
    >
      <span role="listitem">
        <VisaLogo />
      </span>
      <span role="listitem">
        <MastercardLogo />
      </span>
      <span role="listitem">
        <AmexLogo />
      </span>
      <span role="listitem">
        <BankLogo />
      </span>
      <span role="listitem">
        <B2BLogo />
      </span>
      <span role="listitem">
        <CryptoLogo />
      </span>
    </div>
  );
}
