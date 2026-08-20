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
        {
          id: "licenses-google-workspace",
          label: t("licensesGoogleWorkspace"),
          href: "/email",
          pathMatch: "/email",
        },
        {
          id: "licenses-webmail",
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

export function usePublicNavigation(): PublicNavGroup[] {
  const locale = useLocale();
  const t = useTranslations("nav");
  const fallbackNav = useMemo(() => buildFallbackNavigation(t), [t]);
  const [groups, setGroups] = useState<PublicNavGroup[]>(fallbackNav);

  useEffect(() => {
    setGroups(fallbackNav);
  }, [fallbackNav]);

  useEffect(() => {
    let active = true;

    listPublicNavigation(locale)
      .then((data) => {
        if (active && data.length > 0) {
          setGroups(data);
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
  }, [locale, fallbackNav]);

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
