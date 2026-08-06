"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminCmsCreateLicensePageForm } from "@/components/admin/admin-cms-create-license-page-form";
import { PageHeader } from "@/components/ui";
import { listAdminCmsPages } from "@/features/admin/services/admin-cms.service";
import { useRequireAuth } from "@/features/auth";
import type { AdminCmsPageSummary } from "@/features/cms/types";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

const FALLBACK_PAGES = [
  { slug: "hosting", title: "Hosting" },
  { slug: "licenses", title: "Licenses" },
  { slug: "email", title: "Email & Workspace" },
  { slug: "vps", title: "VDS / VPS" },
] as const;

export default function AdminCmsPagesList(): React.ReactElement | null {
  useRequireAuth();
  const tp = useTranslations("admin.pages.cms");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [pages, setPages] = useState<AdminCmsPageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPages = () => {
    setLoading(true);
    listAdminCmsPages()
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadPages();
  }, [isAdmin]);

  if (!isAdmin) {
    return <p className="text-on-surface-variant">Only administrators can manage page content.</p>;
  }

  const display =
    pages.length > 0
      ? pages
      : FALLBACK_PAGES.map((p) => ({
          id: p.slug,
          slug: p.slug,
          title: { tr: p.title, en: p.title },
          isActive: true,
          sectionCount: 0,
          createdAt: "",
          updatedAt: "",
        }));

  return (
    <div className="space-y-6">
      <PageHeader title={tp("title")} description={tp("listDescription")} />

      <AdminCmsCreateLicensePageForm onCreated={loadPages} />

      {loading ? (
        <p className="text-sm text-[var(--label-secondary)]">{tp("loading")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {display.map((page) => {
            const labels = page.title as { tr?: string; en?: string; az?: string; ru?: string };
            const title = labels.en || labels.tr || labels.az || labels.ru || page.slug;
            return (
              <Link
                key={page.slug}
                href={`/t4abriz/panel/cms/${page.slug}`}
                className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--accent)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                  {page.pathSegment ? `/licenses/${page.pathSegment}` : `/${page.slug}`}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--label)]">{title}</h2>
                <p className="mt-1 text-sm text-[var(--label-secondary)]">
                  {tp("sectionCount", { count: page.sectionCount })}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-sm text-[var(--label-secondary)]">{tp("catalogHint")}</p>
    </div>
  );
}
