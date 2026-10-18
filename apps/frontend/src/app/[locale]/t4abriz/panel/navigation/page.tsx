"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { PageHeader, StatusBadge } from "@/components/ui";
import {
  createAdminNavGroup,
  createAdminNavItem,
  deleteAdminNavGroup,
  deleteAdminNavItem,
  listAdminNavigation,
  reorderAdminNavGroups,
  reorderAdminNavItems,
  updateAdminNavGroup,
  updateAdminNavItem,
  type AdminNavGroup,
  type NavLabels,
} from "@/features/admin/services/admin-navigation.service";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const EMPTY_LABELS: NavLabels = { tr: "", en: "", az: "", ru: "" };

function moveEntry<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

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
  const [reordering, setReordering] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    key: "",
    labels: { ...EMPTY_LABELS },
    sortOrder: 0,
  });
  const [itemForms, setItemForms] = useState<
    Record<
      string,
      {
        labels: NavLabels;
        href: string;
        pathMatch: string;
        sortOrder: number;
      }
    >
  >({});

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

  const handleMoveGroup = async (index: number, direction: -1 | 1) => {
    const previous = groups;
    const next = moveEntry(groups, index, direction).map((group, sortOrder) => ({
      ...group,
      sortOrder,
    }));
    if (next === groups) return;
    setGroups(next);
    setReordering("groups");
    try {
      setGroups(await reorderAdminNavGroups(next.map((group) => group.id)));
      toast(tp("orderSaved"), "success");
    } catch {
      setGroups(previous);
      toast(tp("saveFailed"), "error");
    } finally {
      setReordering(null);
    }
  };

  const handleMoveItem = async (groupId: string, itemIndex: number, direction: -1 | 1) => {
    const previous = groups;
    const group = groups.find((entry) => entry.id === groupId);
    if (!group) return;
    const nextItems = moveEntry(group.items, itemIndex, direction).map((item, sortOrder) => ({
      ...item,
      sortOrder,
    }));
    if (nextItems === group.items) return;
    setGroups((current) =>
      current.map((entry) => (entry.id === groupId ? { ...entry, items: nextItems } : entry)),
    );
    setReordering(groupId);
    try {
      const saved = await reorderAdminNavItems(
        groupId,
        nextItems.map((item) => item.id),
      );
      setGroups((current) => current.map((entry) => (entry.id === groupId ? saved : entry)));
      toast(tp("orderSaved"), "success");
    } catch {
      setGroups(previous);
      toast(tp("saveFailed"), "error");
    } finally {
      setReordering(null);
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

      <section className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <MaterialIcon name="swap_vert" />
          </span>
          <div>
            <h2 className="text-on-surface font-semibold">{tp("reorderTitle")}</h2>
            <p className="text-on-surface-variant mt-0.5 max-w-2xl text-sm leading-6">
              {tp("reorderHelp")}
            </p>
          </div>
        </div>
        <div className="text-on-surface-variant flex shrink-0 items-center gap-2 text-xs font-medium">
          <span className="border-outline-variant bg-surface rounded-full border px-3 py-1.5">
            {groups.length} {tp("categories")}
          </span>
          <span className="border-outline-variant bg-surface rounded-full border px-3 py-1.5">
            {groups.reduce((sum, group) => sum + group.items.length, 0)} {tp("subLinks")}
          </span>
        </div>
      </section>

      <section className="border-outline-variant bg-surface-container-low rounded-2xl border p-5">
        <h2 className="text-on-surface text-lg font-semibold">{tp("addGroup")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={groupForm.key}
            onChange={(e) => setGroupForm((prev) => ({ ...prev, key: e.target.value }))}
            placeholder={tp("groupKey")}
            className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
          />
          <input
            type="number"
            value={groupForm.sortOrder}
            onChange={(e) =>
              setGroupForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
            }
            placeholder={tp("sortOrder")}
            className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
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
              className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleCreateGroup}
          className="bg-primary text-on-primary mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
        >
          {tp("addGroup")}
        </button>
      </section>

      {loading ? (
        <p className="text-on-surface-variant">{tp("loading")}</p>
      ) : (
        groups.map((group, groupIndex) => {
          const itemForm = itemForms[group.id] ?? {
            labels: { ...EMPTY_LABELS },
            href: "",
            pathMatch: "",
            sortOrder: group.items.length,
          };

          return (
            <section
              key={group.id}
              className="border-outline-variant bg-surface-container-low rounded-2xl border p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                    {String(groupIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-on-surface truncate text-lg font-semibold">
                      {labelForLocale(group.labels, locale)}
                    </h2>
                    <p className="text-on-surface-variant truncate text-sm">
                      {group.key} · {group.items.length} {tp("subLinks")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div
                    className="border-outline-variant bg-surface flex items-center rounded-xl border p-1"
                    aria-label={tp("categoryOrder")}
                  >
                    <button
                      type="button"
                      disabled={groupIndex === 0 || reordering !== null}
                      onClick={() => handleMoveGroup(groupIndex, -1)}
                      aria-label={tp("moveUp")}
                      title={tp("moveUp")}
                      className="text-on-surface-variant hover:bg-surface-container flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <MaterialIcon name="arrow_upward" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      disabled={groupIndex === groups.length - 1 || reordering !== null}
                      onClick={() => handleMoveGroup(groupIndex, 1)}
                      aria-label={tp("moveDown")}
                      title={tp("moveDown")}
                      className="text-on-surface-variant hover:bg-surface-container flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <MaterialIcon name="arrow_downward" className="text-[18px]" />
                    </button>
                  </div>
                  <StatusBadge status={group.isActive ? "ACTIVE" : "SUSPENDED"} />
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group)}
                    className="border-outline-variant rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {group.isActive ? tp("deactivate") : tp("activate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    className="border-error/30 text-error rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {tp("delete")}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-outline-variant text-on-surface-variant border-b text-left">
                      <th className="w-24 px-2 py-2">{tp("sortOrder")}</th>
                      <th className="px-2 py-2">{tp("label")}</th>
                      <th className="px-2 py-2">{tp("href")}</th>
                      <th className="px-2 py-2">{tp("pathMatch")}</th>
                      <th className="px-2 py-2">{tp("status")}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, itemIndex) => (
                      <tr key={item.id} className="border-outline-variant/60 border-b">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-on-surface-variant w-5 text-center text-xs font-semibold">
                              {itemIndex + 1}
                            </span>
                            <button
                              type="button"
                              disabled={itemIndex === 0 || reordering !== null}
                              onClick={() => handleMoveItem(group.id, itemIndex, -1)}
                              aria-label={`${labelForLocale(item.labels, locale)} — ${tp("moveUp")}`}
                              title={tp("moveUp")}
                              className="text-on-surface-variant hover:bg-surface-container flex h-7 w-7 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-25"
                            >
                              <MaterialIcon name="keyboard_arrow_up" className="text-[18px]" />
                            </button>
                            <button
                              type="button"
                              disabled={itemIndex === group.items.length - 1 || reordering !== null}
                              onClick={() => handleMoveItem(group.id, itemIndex, 1)}
                              aria-label={`${labelForLocale(item.labels, locale)} — ${tp("moveDown")}`}
                              title={tp("moveDown")}
                              className="text-on-surface-variant hover:bg-surface-container flex h-7 w-7 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-25"
                            >
                              <MaterialIcon name="keyboard_arrow_down" className="text-[18px]" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2">{labelForLocale(item.labels, locale)}</td>
                        <td className="px-2 py-2 font-mono text-xs">{item.href}</td>
                        <td className="px-2 py-2 font-mono text-xs">{item.pathMatch ?? "—"}</td>
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
                    className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
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
                  className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
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
                  className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
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
                  className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCreateItem(group.id)}
                className="bg-secondary text-on-secondary mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
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
