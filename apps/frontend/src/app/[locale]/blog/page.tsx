import { MarketingShell } from "@/components/layout/marketing-shell";
import { Link } from "@/i18n/navigation";

export default function BlogPage(): React.ReactElement {
  return (
    <MarketingShell>
      <section className="apple-page py-20">
        <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--label)]">Blog</h1>
          <p className="mt-4 text-[17px] text-[var(--label-secondary)]">
            Blog sayfasi yakinda. Lisans, hosting, VPS/VDS, VPN ve deploy icerikleri yayinlanacak.
          </p>
          <Link href="/forum" className="apple-btn apple-btn-ghost mt-8 inline-flex px-6">
            Forum sayfasina git
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
