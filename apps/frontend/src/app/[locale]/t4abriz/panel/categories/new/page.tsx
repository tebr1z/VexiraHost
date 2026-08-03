"use client";

import { useTranslations } from "next-intl";

import {
  CatalogCategoryForm,
  toCatalogCategoryPayload,
} from "@/components/admin/catalog-category-form";
import { PageHeader } from "@/components/ui";
import { createAdminCatalogCategory } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

export default function NewCatalogCategoryPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.categories");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.categories"), href: "/t4abriz/panel/categories" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <CatalogCategoryForm
        submitLabel={tf("saveCategory")}
        onSubmit={async (values) => {
          await createAdminCatalogCategory(toCatalogCategoryPayload(values));
          toast(tt("categoryCreated"), "success");
          router.push("/t4abriz/panel/categories");
        }}
      />
    </div>
  );
}
