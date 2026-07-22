"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  listPublicNavigation,
  type PublicNavGroup,
} from "@/features/navigation/services/navigation.service";

function buildFallbackNavigation(
  t: (key: Parameters<ReturnType<typeof useTranslations<"nav">>>[0]) => string,
): PublicNavGroup[] {
  return [
    {
      key: "licenses",
      label: t("licenses"),
      items: [
        { id: "licenses-windows-office", label: t("licensesWindowsOffice"), href: "/#pricing" },
        { id: "licenses-antivirus", label: t("licensesAntivirus"), href: "/#pricing" },
        { id: "licenses-other", label: t("licensesOther"), href: "/#pricing" },
      ],
    },
    {
      key: "hostingServers",
      label: t("hostingServers"),
      items: [
        { id: "hosting-web", label: t("hostingWeb"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-vds-vps", label: t("hostingVdsVps"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-vpn", label: t("hostingVpn"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-n8n", label: t("hostingN8n"), href: "/hosting", pathMatch: "/hosting" },
        { id: "hosting-deploy", label: t("hostingDirectDeploy"), href: "/hosting", pathMatch: "/hosting" },
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

  return groups;
}
