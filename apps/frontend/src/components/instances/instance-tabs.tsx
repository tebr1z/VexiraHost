"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";

const TAB_KEYS = ["snapshots", "backups", "firewall", "ipManagement"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const BACKUP_ILLUSTRATION =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBPJgVKHQgj1pNOFPU6e--t66_5uIzWKmWk_YdTNgeQZo0i1B9KxDLtYjO8I5ffL6X6NA4Jas7ta4jLRy_g2_zEqScCvCcaxEnn4vS3gQE3nJZKo9SwkxVcGt5RFRS-FbxYMgf_VVQk63OJdkWCrcMWSQsCXtjdcpG4pac6dULmNm5XSN-ktaRda6MFW3gcjghuWlS5FJ8rgzmdwPqgJGipo1B8uXt1YluDAof6xCvACvvCKYkVc-pwGjSTbtKOou4EZhGanXMIKI5W";

export function InstanceTabs(): React.ReactElement {
  const t = useTranslations("instances");
  const tt = useTranslations("instances.tabs");
  const [activeTab, setActiveTab] = useState<TabKey>("snapshots");

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/20 glass-card shadow-precision">
      <div className="flex overflow-x-auto border-b border-outline-variant/30 px-margin-mobile">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-4 font-inter text-body-md transition-colors ${
              activeTab === tab
                ? "tab-active font-semibold text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {tt(tab)}
          </button>
        ))}
      </div>

      <div className="flex min-h-[400px] flex-col items-center justify-center p-margin-mobile text-center md:p-margin-desktop">
        <div className="relative mb-stack-md flex h-64 w-64 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-surface-container opacity-30" />
          <div className="z-10 rounded-[2rem] border border-outline-variant/10 bg-white p-8 shadow-xl">
            <Image
              src={BACKUP_ILLUSTRATION}
              alt={t("backupIllustrationAlt")}
              width={128}
              height={128}
              className="h-32 w-32 object-contain"
              unoptimized
            />
          </div>
        </div>
        <h3 className="mb-2 font-jakarta text-headline-lg font-bold text-primary">
          {t("emptyTitle", { tab: tt(activeTab).toLowerCase() })}
        </h3>
        <p className="mb-8 max-w-md font-inter text-body-md text-on-surface-variant">
          {t("emptyDescription")}
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-on-primary transition-all hover:bg-secondary active:scale-95"
        >
          <MaterialIcon name="backup" />
          {t("createBackup")}
        </button>
      </div>
    </div>
  );
}
