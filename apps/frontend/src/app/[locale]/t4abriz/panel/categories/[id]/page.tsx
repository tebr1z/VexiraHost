"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  CatalogCategoryForm,
  catalogCategoryToFormValues,
  toCatalogCategoryPayload,
} from "@/components/admin/catalog-category-form";
import { PageHeader } from "@/components/ui";
import {
  getAdminCatalogCategory,
  updateAdminCatalogCategory,
  type AdminCatalogCategory,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

export default function EditCatalogCategoryPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.categories");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [category, setCategory] = useState<AdminCatalogCategory | null>(null);

  useEffect(() => {
    getAdminCatalogCategory(id)
      .then(setCategory)
      .catch(() => {
        toast(tp("loadFailed"), "error");
        router.push("/t4abriz/panel/categories");
      });
  }, [id, router, tp]);

  if (!category) {
    return <p className="text-on-surface-variant">{tu("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("editTitle", { name: category.name })}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.categories"), href: "/t4abriz/panel/categories" },
          { label: category.name },
        ]}
      />
      <CatalogCategoryForm
        initialValues={catalogCategoryToFormValues(category)}
        submitLabel={tf("saveCategory")}
        onSubmit={async (values) => {
          await updateAdminCatalogCategory(category.id, toCatalogCategoryPayload(values));
          toast(tt("categoryUpdated"), "success");
          router.push("/t4abriz/panel/categories");
        }}
      />
    </div>
  );
}
