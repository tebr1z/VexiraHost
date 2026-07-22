"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ProductForm, pricesFromAdmin, toProductPayload } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui";
import { getAdminProduct, updateAdminProduct, type AdminProduct } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function EditProductPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [product, setProduct] = useState<AdminProduct | null>(null);

  useEffect(() => {
    getAdminProduct(id).then(setProduct).catch(() => undefined);
  }, [id]);

  if (!product) return <p className="text-on-surface-variant">{tu("loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.products"), href: "/t4abriz/panel/products" },
          { label: product.name },
        ]}
      />
      <ProductForm
        currentSlug={product.slug}
        submitLabel={tf("updateProduct")}
        initialValues={{
          name: product.name,
          description: product.description ?? "",
          category: product.category,
          hostingPlanSlug: product.hostingPlanSlug ?? "",
          price: String(product.price),
          isActive: product.isActive,
          sortOrder: String(product.sortOrder),
          prices: pricesFromAdmin(product.prices, product.price),
        }}
        onSubmit={async (values) => {
          await updateAdminProduct(id, toProductPayload(values));
          toast(tt("productUpdated"), "success");
          router.push("/t4abriz/panel/products");
        }}
      />
      <Link href="/t4abriz/panel/products" className="text-sm text-secondary hover:underline">
        ← {ta("actions.back")}
      </Link>
    </div>
  );
}
