"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import {
  createAdminNavGroup,
  createAdminNavItem,
  deleteAdminNavGroup,
  deleteAdminNavItem,
  listAdminNavigation,
  updateAdminNavGroup,
  updateAdminNavItem,
  type AdminNavGroup,
  type NavLabels,
} from "@/features/admin/services/admin-navigation.service";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const EMPTY_LABELS: NavLabels = { tr: "", en: "", az: "", ru: "" };

function labelForLocale(labels: NavLabels, locale: string): string {
  const key = locale.split("-")[0] as keyof NavLabels;
  return labels[key] || labels.tr || labels.en || "";
}

export default function AdminNavigationPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.navigation");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [groups, setGroups] = useState<AdminNavGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupForm, setGroupForm] = useState({ key: "", labels: { ...EMPTY_LABELS }, sortOrder: 0 });
  const [itemForms, setItemForms] = useState<Record<string, {
    labels: NavLabels;
    href: string;
    pathMatch: string;
    sortOrder: number;
  }>>({});

  const load = useCallback(() => {
    setLoading(true);
    listAdminNavigation()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return <p className="text-on-surface-variant">Only administrators can manage navigation.</p>;
  }

  const handleCreateGroup = async () => {
    if (!groupForm.key.trim() || !groupForm.labels.tr.trim()) {
      toast(tp("requiredFields"), "error");
      return;
    }
    try {
      await createAdminNavGroup(groupForm);
      setGroupForm({ key: "", labels: { ...EMPTY_LABELS }, sortOrder: groups.length });
      toast(tp("groupCreated"), "success");
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleToggleGroup = async (group: AdminNavGroup) => {
    try {
      await updateAdminNavGroup(group.id, { isActive: !group.isActive });
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleDeleteGroup = async (group: AdminNavGroup) => {
    if (!window.confirm(tp("deleteGroupConfirm"))) return;
    try {
      await deleteAdminNavGroup(group.id);
      toast(tp("groupDeleted"), "success");
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleCreateItem = async (groupId: string) => {
    const form = itemForms[groupId] ?? {
      labels: { ...EMPTY_LABELS },
      href: "",
      pathMatch: "",
      sortOrder: 0,
    };
    if (!form.labels.tr.trim() || !form.href.trim()) {
      toast(tp("requiredFields"), "error");
      return;
    }
    try {
      await createAdminNavItem(groupId, {
        labels: form.labels,
        href: form.href,
        pathMatch: form.pathMatch || undefined,
        sortOrder: form.sortOrder,
      });
      setItemForms((prev) => ({
        ...prev,
        [groupId]: { labels: { ...EMPTY_LABELS }, href: "", pathMatch: "", sortOrder: 0 },
      }));
      toast(tp("itemCreated"), "success");
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm(tp("deleteItemConfirm"))) return;
    try {
      await deleteAdminNavItem(itemId);
      toast(tp("itemDeleted"), "success");
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  const handleToggleItem = async (itemId: string, isActive: boolean) => {
    try {
      await updateAdminNavItem(itemId, { isActive: !isActive });
      load();
    } catch {
      toast(tp("saveFailed"), "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
      />

      <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
        <h2 className="text-lg font-semibold text-on-surface">{tp("addGroup")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={groupForm.key}
            onChange={(e) => setGroupForm((prev) => ({ ...prev, key: e.target.value }))}
            placeholder={tp("groupKey")}
            className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
          />
          <input
            type="number"
            value={groupForm.sortOrder}
            onChange={(e) =>
              setGroupForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
            }
            placeholder={tp("sortOrder")}
            className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
          />
          {(["tr", "en", "az", "ru"] as const).map((lang) => (
            <input
              key={lang}
              value={groupForm.labels[lang] ?? ""}
              onChange={(e) =>
                setGroupForm((prev) => ({
                  ...prev,
                  labels: { ...prev.labels, [lang]: e.target.value },
                }))
              }
              placeholder={`${tp("label")} (${lang.toUpperCase()})`}
              className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleCreateGroup}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          {tp("addGroup")}
        </button>
      </section>

      {loading ? (
        <p className="text-on-surface-variant">{tp("loading")}</p>
      ) : (
        groups.map((group) => {
          const itemForm = itemForms[group.id] ?? {
            labels: { ...EMPTY_LABELS },
            href: "",
            pathMatch: "",
            sortOrder: group.items.length,
          };

          return (
            <section
              key={group.id}
              className="rounded-2xl border border-outline-variant bg-surface-container-low p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">
                    {labelForLocale(group.labels, locale)}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {group.key} · {tp("sortOrder")}: {group.sortOrder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={group.isActive ? "ACTIVE" : "SUSPENDED"} />
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group)}
                    className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm"
                  >
                    {group.isActive ? tp("deactivate") : tp("activate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    className="rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error"
                  >
                    {tp("delete")}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                      <th className="px-2 py-2">{tp("label")}</th>
                      <th className="px-2 py-2">{tp("href")}</th>
                      <th className="px-2 py-2">{tp("pathMatch")}</th>
                      <th className="px-2 py-2">{tp("sortOrder")}</th>
                      <th className="px-2 py-2">{tp("status")}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id} className="border-b border-outline-variant/60">
                        <td className="px-2 py-2">{labelForLocale(item.labels, locale)}</td>
                        <td className="px-2 py-2 font-mono text-xs">{item.href}</td>
                        <td className="px-2 py-2 font-mono text-xs">{item.pathMatch ?? "—"}</td>
                        <td className="px-2 py-2">{item.sortOrder}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={item.isActive ? "ACTIVE" : "SUSPENDED"} />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item.id, item.isActive)}
                              className="text-secondary hover:underline"
                            >
                              {item.isActive ? tp("deactivate") : tp("activate")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-error hover:underline"
                            >
                              {tp("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(["tr", "en", "az", "ru"] as const).map((lang) => (
                  <input
                    key={`${group.id}-${lang}`}
                    value={itemForm.labels[lang] ?? ""}
                    onChange={(e) =>
                      setItemForms((prev) => ({
                        ...prev,
                        [group.id]: {
                          ...itemForm,
                          labels: { ...itemForm.labels, [lang]: e.target.value },
                        },
                      }))
                    }
                    placeholder={`${tp("label")} (${lang.toUpperCase()})`}
                    className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
                  />
                ))}
                <input
                  value={itemForm.href}
                  onChange={(e) =>
                    setItemForms((prev) => ({
                      ...prev,
                      [group.id]: { ...itemForm, href: e.target.value },
                    }))
                  }
                  placeholder={tp("href")}
                  className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
                />
                <input
                  value={itemForm.pathMatch}
                  onChange={(e) =>
                    setItemForms((prev) => ({
                      ...prev,
                      [group.id]: { ...itemForm, pathMatch: e.target.value },
                    }))
                  }
                  placeholder={tp("pathMatch")}
                  className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
                />
                <input
                  type="number"
                  value={itemForm.sortOrder}
                  onChange={(e) =>
                    setItemForms((prev) => ({
                      ...prev,
                      [group.id]: {
                        ...itemForm,
                        sortOrder: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  placeholder={tp("sortOrder")}
                  className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCreateItem(group.id)}
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-secondary px-5 text-sm font-semibold text-on-secondary"
              >
                {tp("addItem")}
              </button>
            </section>
          );
        })
      )}
    </div>
  );
}
