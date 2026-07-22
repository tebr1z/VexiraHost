import { Injectable } from "@nestjs/common";

import { NavigationRepository } from "../repository/navigation.repository";

type NavLabels = {
  tr: string;
  en?: string;
  az?: string;
  ru?: string;
};

function resolveLabel(labels: unknown, locale: string): string {
  const record = labels as NavLabels;
  const normalized = locale.toLowerCase().split("-")[0];
  const value =
    (normalized === "tr" && record.tr) ||
    (normalized === "en" && record.en) ||
    (normalized === "az" && record.az) ||
    (normalized === "ru" && record.ru) ||
    record.en ||
    record.tr ||
    record.az ||
    record.ru;
  return value ?? "";
}

function mapGroupForAdmin(group: {
  id: string;
  key: string;
  labels: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    groupId: string;
    labels: unknown;
    href: string;
    pathMatch: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  return {
    id: group.id,
    key: group.key,
    labels: group.labels as NavLabels,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    items: group.items.map((item) => ({
      id: item.id,
      groupId: item.groupId,
      labels: item.labels as NavLabels,
      href: item.href,
      pathMatch: item.pathMatch,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

@Injectable()
export class NavigationService {
  constructor(private readonly repository: NavigationRepository) {}

  listPublic(locale = "tr") {
    return this.repository.findActiveGroups().then((groups) =>
      groups.map((group) => ({
        key: group.key,
        label: resolveLabel(group.labels, locale),
        items: group.items.map((item) => ({
          id: item.id,
          label: resolveLabel(item.labels, locale),
          href: item.href,
          pathMatch: item.pathMatch ?? undefined,
        })),
      })),
    );
  }

  listAdmin() {
    return this.repository.findAllGroups().then((groups) => groups.map(mapGroupForAdmin));
  }

  getAdminGroup(id: string) {
    return this.repository.findGroupById(id).then((group) => (group ? mapGroupForAdmin(group) : null));
  }
}
