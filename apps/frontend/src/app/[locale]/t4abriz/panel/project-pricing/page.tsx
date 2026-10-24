"use client";

import type { ProjectPricingDocument } from "@vexira/types";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ProjectPricingEditor } from "@/components/admin/project-pricing-editor";
import {
  getAdminProjectPricing,
  saveAdminProjectPricing,
} from "@/features/admin/services/project-pricing.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

import "@/styles/project-pricing-admin.css";

export default function ProjectPricingPage() {
  const t = useTranslations("projectPricingAdmin");
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const [document, setDocument] = useState<ProjectPricingDocument | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setDocument(await getAdminProjectPricing());
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed")));
    }
  }, [t]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  if (!isAdmin) return <p>{t("adminOnly")}</p>;
  if (error)
    return (
      <div role="alert" className="dashboard-section-card space-y-4 p-6">
        <p>{error}</p>
        <button type="button" className="dashboard-btn-primary" onClick={() => void load()}>
          {t("retry")}
        </button>
      </div>
    );
  if (!document) return <p role="status">{t("loading")}</p>;
  return <ProjectPricingEditor initial={document} onSave={saveAdminProjectPricing} />;
}
