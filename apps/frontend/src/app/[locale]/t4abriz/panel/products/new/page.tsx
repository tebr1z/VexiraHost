"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { ProductForm, toProductPayload } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui";
import { createAdminProduct } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function NewProductPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.products");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.products"), href: "/t4abriz/panel/products" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <ProductForm
        submitLabel={tf("saveProduct")}
        onSubmit={async (values) => {
          await createAdminProduct(toProductPayload(values));
          toast(tt("productCreated"), "success");
          router.push("/t4abriz/panel/products");
        }}
      />
    </div>
  );
}
