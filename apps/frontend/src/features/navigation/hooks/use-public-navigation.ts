"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  listPublicNavigation,
  type PublicNavGroup,
} from "@/features/navigation/services/navigation.service";
import { isStaffRole } from "@/lib/is-staff-role";
import { isHrefBlocked } from "@/lib/site-access";
import { useAuthStore } from "@/stores/auth-store";
import { useMaintenanceStore } from "@/stores/maintenance-store";

function buildFallbackNavigation(
  t: (key: Parameters<ReturnType<typeof useTranslations<"nav">>>[0]) => string,
): PublicNavGroup[] {
  return [
    {
      key: "licenses",
      label: t("licenses"),
      items: [
        { id: "licenses-all", label: t("licensesAll"), href: "/licenses", pathMatch: "/licenses" },
        {
          id: "licenses-windows",
          label: t("licensesWindows"),
          href: "/licenses/windows",
          pathMatch: "/licenses/windows",
        },
        {
          id: "licenses-server",
          label: t("licensesServer"),
          href: "/licenses/server",
          pathMatch: "/licenses/server",
        },
        {
          id: "licenses-office",
          label: t("licensesOffice"),
          href: "/licenses/office",
          pathMatch: "/licenses/office",
        },
        {
          id: "licenses-antivirus",
          label: t("licensesAntivirus"),
          href: "/licenses/antivirus",
          pathMatch: "/licenses/antivirus",
        },
      ],
    },
    {
      key: "email",
      label: t("emailServices"),
      items: [
        {
          id: "email-google-workspace",
          label: t("licensesGoogleWorkspace"),
          href: "/email",
          pathMatch: "/email",
        },
        {
          id: "email-webmail",
          label: t("licensesWebmail"),
          href: "/webmail",
          pathMatch: "/webmail",
        },
      ],
    },
    {
      key: "hostingServers",
      label: t("hostingServers"),
      items: [
        { id: "hosting-web", label: t("hostingWeb"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-vds-vps", label: t("hostingVdsVps"), href: "/vps", pathMatch: "/vps" },
        { id: "hosting-vpn", label: t("hostingVpn"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-n8n", label: t("hostingN8n"), href: "/hosting", pathMatch: "/hosting" },
        {
          id: "hosting-deploy",
          label: t("hostingDirectDeploy"),
          href: "/hosting",
          pathMatch: "/hosting",
        },
      ],
    },
    {
      key: "whatsappApi",
      label: t("whatsappApi"),
      items: [
        {
          id: "whatsapp-api-products",
          label: t("whatsappApiPackages"),
          href: "/products/whatsapp-api",
          pathMatch: "/products/whatsapp-api",
        },
      ],
    },
    {
      key: "forumBlog",
      label: t("forumBlog"),
      items: [
        { id: "forum", label: t("forumLabel"), href: "/forum", pathMatch: "/forum" },
        { id: "blog", label: t("blogLabel"), href: "/blog", pathMatch: "/blog" },
      ],
    },
  ];
}

function isEmailItem(item: PublicNavGroup["items"][number]): boolean {
  const searchable = `${item.id} ${item.href} ${item.pathMatch ?? ""}`.toLowerCase();
  return (
    searchable.includes("webmail") || searchable.includes("workspace") || item.href === "/email"
  );
}

function organizeNavigation(groups: PublicNavGroup[], emailLabel: string): PublicNavGroup[] {
  const emailItems = groups.flatMap((group) => group.items.filter(isEmailItem));
  const cleaned = groups
    .filter((group) => group.key !== "email")
    .map((group) => ({ ...group, items: group.items.filter((item) => !isEmailItem(item)) }))
    .filter((group) => group.items.length > 0);

  if (emailItems.length > 0) {
    const uniqueItems = emailItems.filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.href === item.href) === index,
    );
    cleaned.push({ key: "email", label: emailLabel, items: uniqueItems });
  }

  const order = ["hostingServers", "email", "licenses", "whatsappApi", "catalog", "forumBlog"];
  return cleaned.sort((a, b) => {
    const aIndex = order.indexOf(a.key);
    const bIndex = order.indexOf(b.key);
    return (aIndex < 0 ? order.length : aIndex) - (bIndex < 0 ? order.length : bIndex);
  });
}

export function usePublicNavigation(): PublicNavGroup[] {
  const locale = useLocale();
  const t = useTranslations("nav");
  const fallbackNav = useMemo(
    () => organizeNavigation(buildFallbackNavigation(t), t("emailServices")),
    [t],
  );
  const [groups, setGroups] = useState<PublicNavGroup[]>(fallbackNav);

  useEffect(() => {
    setGroups(fallbackNav);
  }, [fallbackNav]);

  useEffect(() => {
    let active = true;

    listPublicNavigation(locale)
      .then((data) => {
        if (active && data.length > 0) {
          setGroups(organizeNavigation(data, t("emailServices")));
        }
      })
      .catch(() => {
        if (active) {
          setGroups(fallbackNav);
        }
      });

    return () => {
      active = false;
    };
  }, [locale, fallbackNav, t]);

  const access = useMaintenanceStore((s) => s.access);
  const role = useAuthStore((s) => s.user?.role);

  return useMemo(() => {
    if (isStaffRole(role)) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !isHrefBlocked(item.href, access)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, access, role]);
}
