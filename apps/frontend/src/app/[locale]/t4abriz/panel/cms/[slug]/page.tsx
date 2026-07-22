"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import {
  createAdminCmsSection,
  deleteAdminCmsSection,
  getAdminCmsPage,
  reorderAdminCmsSections,
  updateAdminCmsSection,
  type CmsDesign,
  type CmsSectionType,
} from "@/features/admin/services/admin-cms.service";
import type { AdminCmsPage, AdminCmsSection } from "@/features/cms/types";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const SECTION_TYPES: CmsSectionType[] = [
  "HERO",
  "PLANS",
  "INCLUDED",
  "FEATURES",
  "FAQ",
  "CTA",
  "STATS",
  "RICH_TEXT",
  "BANNER",
  "CUSTOM",
];

const EMPTY_DESIGN: CmsDesign = {};

export default function AdminCmsPageEditor(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "hosting";
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.cms");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [page, setPage] = useState<AdminCmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminCmsSection | null>(null);
  const [contentJson, setContentJson] = useState("{}");
  const [design, setDesign] = useState<CmsDesign>(EMPTY_DESIGN);
  const [newSection, setNewSection] = useState({
    key: "",
    type: "CUSTOM" as CmsSectionType,
    contentJson: '{\n  "title": { "tr": "", "en": "", "ru": "", "az": "" }\n}',
  });

  const load = useCallback(() => {
    setLoading(true);
    getAdminCmsPage(slug)
      .then(setPage)
      .catch(() => toast(tp("saveFailed"), "error"))
      .finally(() => setLoading(false));
  }, [slug, tp]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return <p className="text-on-surface-variant">Only administrators can manage page content.</p>;
  }

  const parseJson = (raw: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const startEdit = (section: AdminCmsSection) => {
    setEditing(section);
    setContentJson(JSON.stringify(section.content, null, 2));
    setDesign(section.design ?? {});
  };

  const saveEdit = async () => {
    if (!editing) return;
    const content = parseJson(contentJson);
    if (!content) {
      toast(tp("invalidJson"), "error");
      return;
    }
    try {
      await updateAdminCmsSection(editing.id, { content, design });
      toast(tp("saveSuccess"), "success");
      setEditing(null);
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleDelete = async (section: AdminCmsSection) => {
    if (!window.confirm(tp("deleteConfirm"))) return;
    try {
      await deleteAdminCmsSection(section.id);
      if (editing?.id === section.id) setEditing(null);
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    if (!page) return;
    const next = [...page.sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    try {
      await reorderAdminCmsSections(
        slug,
        next.map((s) => s.id),
      );
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleCreate = async () => {
    if (!newSection.key.trim()) {
      toast(tp("requiredFields"), "error");
      return;
    }
    const content = parseJson(newSection.contentJson);
    if (!content) {
      toast(tp("invalidJson"), "error");
      return;
    }
    try {
      await createAdminCmsSection(slug, {
        key: newSection.key.trim(),
        type: newSection.type,
        content,
        design: {},
        sortOrder: page?.sections.length ?? 0,
      });
      toast(tp("saveSuccess"), "success");
      setNewSection({
        key: "",
        type: "CUSTOM",
        contentJson: '{\n  "title": { "tr": "", "en": "", "ru": "", "az": "" }\n}',
      });
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title"), href: `/t4abriz/panel/cms/${slug}` },
        ]}
        actions={
          <Link
            href="/hosting"
            className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container-low"
            target="_blank"
          >
            {tp("preview")}
          </Link>
        }
      />

      <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        {tp("contentHint")}
      </p>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="mb-4 text-lg font-semibold">{tp("addSection")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="h-11 rounded-xl border border-outline-variant px-3 text-sm"
            placeholder={tp("sectionKey")}
            value={newSection.key}
            onChange={(e) => setNewSection((s) => ({ ...s, key: e.target.value }))}
          />
          <select
            className="h-11 rounded-xl border border-outline-variant px-3 text-sm"
            value={newSection.type}
            onChange={(e) =>
              setNewSection((s) => ({ ...s, type: e.target.value as CmsSectionType }))
            }
          >
            {SECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {tp(`types.${type}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            className="h-11 rounded-xl bg-primary text-sm font-semibold text-on-primary"
          >
            {tp("addSection")}
          </button>
        </div>
        <textarea
          className="mt-3 min-h-[120px] w-full rounded-xl border border-outline-variant p-3 font-mono text-xs"
          value={newSection.contentJson}
          onChange={(e) => setNewSection((s) => ({ ...s, contentJson: e.target.value }))}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{tp("sections")}</h2>
        {loading ? (
          <p className="text-on-surface-variant">{tp("loading")}</p>
        ) : (
          <div className="space-y-3">
            {page?.sections.map((section, index) => (
              <div
                key={section.id}
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {section.key}{" "}
                      <span className="text-sm font-normal text-on-surface-variant">
                        ({tp(`types.${section.type}`)})
                      </span>
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      #{section.sortOrder} · {section.isActive ? tp("active") : tp("inactive")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-xs"
                      onClick={() => moveSection(index, -1)}
                    >
                      {tp("moveUp")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-xs"
                      onClick={() => moveSection(index, 1)}
                    >
                      {tp("moveDown")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-xs"
                      onClick={() => startEdit(section)}
                    >
                      {tp("editSection")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs text-error"
                      onClick={() => handleDelete(section)}
                    >
                      {tp("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <section className="rounded-2xl border border-secondary/30 bg-surface-container-low p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {tp("editSection")}: {editing.key}
          </h2>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">
              {tp("variant")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.variant ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, variant: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              {tp("layout")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.layout ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, layout: e.target.value as CmsDesign["layout"] }))}
              />
            </label>
            <label className="text-xs">
              {tp("padding")}
              <select
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.padding ?? "md"}
                onChange={(e) =>
                  setDesign((d) => ({ ...d, padding: e.target.value as CmsDesign["padding"] }))
                }
              >
                {["sm", "md", "lg", "xl"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              {tp("columns")}
              <input
                type="number"
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.columns ?? ""}
                onChange={(e) =>
                  setDesign((d) => ({ ...d, columns: Number(e.target.value) || undefined }))
                }
              />
            </label>
            <label className="text-xs sm:col-span-2">
              {tp("className")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.className ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, className: e.target.value }))}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              {tp("background")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.background ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, background: e.target.value }))}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              {tp("backgroundImage")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.backgroundImage ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, backgroundImage: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              {tp("icon")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.icon ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, icon: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              {tp("accentColor")}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-2 text-sm"
                value={design.accentColor ?? ""}
                onChange={(e) => setDesign((d) => ({ ...d, accentColor: e.target.value }))}
              />
            </label>
          </div>

          <label className="mb-2 block text-sm font-medium">{tp("contentJson")}</label>
          <textarea
            className="min-h-[320px] w-full rounded-xl border border-outline-variant p-3 font-mono text-xs"
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
            >
              {tp("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border px-5 py-2.5 text-sm"
            >
              {tp("cancel")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
