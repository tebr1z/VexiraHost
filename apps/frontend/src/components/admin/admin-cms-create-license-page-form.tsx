"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  createAdminCmsPage,
  LICENSE_CMS_SECTIONS,
  type I18nText,
} from "@/features/admin/services/admin-cms.service";
import { toast } from "@/stores/toast-store";

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCmsCreateLicensePageForm({
  onCreated,
}: {
  onCreated: () => void;
}): React.ReactElement {
  const tp = useTranslations("admin.pages.cms");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sectionSlug, setSectionSlug] = useState<string>(LICENSE_CMS_SECTIONS[0].slug);
  const [pathSuffix, setPathSuffix] = useState("");
  const [titleTr, setTitleTr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [productSlugs, setProductSlugs] = useState("");

  const section = useMemo(
    () => LICENSE_CMS_SECTIONS.find((s) => s.slug === sectionSlug) ?? LICENSE_CMS_SECTIONS[0],
    [sectionSlug],
  );

  const pathPreview = useMemo(() => {
    const suffix = slugifySegment(pathSuffix);
    if (!suffix) return `/licenses/${section.pathPrefix}-...`;
    return `/licenses/${section.pathPrefix}-${suffix}`;
  }, [pathSuffix, section.pathPrefix]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const suffix = slugifySegment(pathSuffix);
    if (!suffix || !titleTr.trim()) {
      toast(tp("requiredFields"), "error");
      return;
    }

    const pathSegment = `${section.pathPrefix}-${suffix}`;
    const slug = `licenses-${pathSegment}`;
    const title: I18nText = {
      tr: titleTr.trim(),
      en: titleEn.trim() || titleTr.trim(),
    };

    setSubmitting(true);
    try {
      await createAdminCmsPage({
        slug,
        title,
        parentSlug: section.slug,
        pathSegment,
        template: "license-catalog",
        productSlugs: productSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast(tp("createSuccess"), "success");
      setPathSuffix("");
      setTitleTr("");
      setTitleEn("");
      setProductSlugs("");
      setOpen(false);
      onCreated();
    } catch {
      toast(tp("createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--label)]">{tp("createLicensePage")}</h2>
          <p className="mt-1 text-sm text-[var(--label-secondary)]">
            {tp("createLicensePageHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          {open ? tp("cancel") : tp("createLicensePage")}
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--label-secondary)]">{tp("licenseSection")}</span>
            <select
              value={sectionSlug}
              onChange={(e) => setSectionSlug(e.target.value)}
              className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2"
            >
              {LICENSE_CMS_SECTIONS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {tp(item.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--label-secondary)]">{tp("pathSuffix")}</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--label-tertiary)]">{section.pathPrefix}-</span>
              <input
                value={pathSuffix}
                onChange={(e) => setPathSuffix(e.target.value)}
                placeholder="11-pro"
                className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2"
              />
            </div>
            <span className="mt-1 block text-xs text-[var(--label-tertiary)]">{pathPreview}</span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--label-secondary)]">{tp("titleTr")}</span>
            <input
              value={titleTr}
              onChange={(e) => setTitleTr(e.target.value)}
              className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--label-secondary)]">{tp("titleEn")}</span>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-[var(--label-secondary)]">{tp("productSlugs")}</span>
            <input
              value={productSlugs}
              onChange={(e) => setProductSlugs(e.target.value)}
              placeholder="windows-11-pro, office-365-license"
              className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? tp("loading") : tp("createPageSubmit")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
