import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/** Passthrough — no admin chrome here, so gated 404 matches the public template. */
export default function StaffAreaLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
