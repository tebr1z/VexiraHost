import Image from "next/image";

import { cn } from "@/lib/cn";

type PaymentItem = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  /** Brand logos ship on black — use dark badge so the mark reads cleanly. */
  brandPhoto?: boolean;
};

const PAYMENTS: PaymentItem[] = [
  {
    id: "visa",
    label: "Visa",
    src: "/payment/visa.png",
    width: 120,
    height: 40,
    brandPhoto: true,
  },
  {
    id: "mastercard",
    label: "Mastercard",
    src: "/payment/mastercard.png",
    width: 56,
    height: 40,
    brandPhoto: true,
  },
  {
    id: "amex",
    label: "American Express",
    src: "/payment/amex.png",
    width: 110,
    height: 48,
    brandPhoto: true,
  },
  { id: "bank", label: "Bank transfer", src: "/payment/bank.svg", width: 48, height: 32 },
  { id: "b2b", label: "B2B invoice", src: "/payment/b2b.svg", width: 48, height: 32 },
  { id: "crypto", label: "Crypto", src: "/payment/crypto.svg", width: 48, height: 32 },
];

function PaymentMark({ item }: { item: PaymentItem }): React.ReactElement {
  return (
    <span
      title={item.label}
      aria-label={item.label}
      className={cn(
        "inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl border",
        "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5",
        item.brandPhoto
          ? cn(
              "min-w-[4.75rem] border-black/80 bg-black px-2.5",
              "shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
              "hover:border-[color-mix(in_srgb,var(--accent)_45%,#000)]",
              "hover:shadow-[0_8px_18px_rgba(0,0,0,0.28)]",
            )
          : cn(
              "min-w-[3.75rem] border-[var(--separator)] bg-white px-2.5",
              "shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
              "hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--separator))]",
              "hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]",
              "dark:border-white/10 dark:bg-[#0F172A] dark:shadow-none",
            ),
      )}
    >
      <Image
        src={item.src}
        alt={item.label}
        width={item.width}
        height={item.height}
        className={cn(
          "object-contain",
          item.id === "visa" && "h-7 w-auto max-w-[5.5rem]",
          item.id === "mastercard" && "h-9 w-auto max-w-[2.75rem]",
          item.id === "amex" && "h-9 w-auto max-w-[5.25rem]",
          (item.id === "bank" || item.id === "b2b" || item.id === "crypto") && "h-8 w-auto",
        )}
        unoptimized
      />
    </span>
  );
}

export function FooterPaymentLogos({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2.5", className)}
      role="list"
      aria-label="Accepted payment methods"
    >
      {PAYMENTS.map((item) => (
        <span key={item.id} role="listitem">
          <PaymentMark item={item} />
        </span>
      ))}
    </div>
  );
}
