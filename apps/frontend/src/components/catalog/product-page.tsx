import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ProductConfigurator } from "./product-configurator";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { productPath } from "@/lib/product-path";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { publicProducts, publicPlans } from "@/lib/server-catalog";

export type ProductPageProps = { params: Promise<{ locale: string; slug: string }> };
async function findProduct(slug: string, hosting: boolean) {
  const products = await publicProducts();
  return (
    products.find(
      (product) => product.publicSlug === slug && (!hosting || product.category === "HOSTING"),
    ) ??
    products.find(
      (product) => product.slug === slug && (!hosting || product.category === "HOSTING"),
    ) ??
    products.find((product) =>
      hosting
        ? product.category === "HOSTING" &&
          (product.hostingPlanSlug === slug || product.slug === slug)
        : product.slug === slug,
    )
  );
}
export async function productMetadata(
  { params }: ProductPageProps,
  hosting: boolean,
): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await findProduct(slug, hosting);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const requestedPath = hosting
    ? `/hosting/${encodeURIComponent(slug)}`
    : `/products/item/${encodeURIComponent(slug)}`;
  const canonicalPath = productPath(product);
  if (requestedPath !== canonicalPath)
    permanentRedirect(locale === "en" ? canonicalPath : `/${locale}${canonicalPath}`);
  const t = await getTranslations({ locale, namespace: "productPurchase" });
  return buildPageMetadata({
    title: `${product.name} · ${t("title")}`,
    description: t("seoDescription", { name: product.name }),
    path: productPath(product),
    locale,
  });
}
export async function ProductPage({
  params,
  hosting = false,
}: ProductPageProps & { hosting?: boolean }) {
  const { locale, slug } = await params;
  const product = await findProduct(slug, hosting);
  if (!product) notFound();
  const path = productPath(product);
  const requested = hosting
    ? `/hosting/${encodeURIComponent(slug)}`
    : `/products/item/${encodeURIComponent(slug)}`;
  if (requested !== path) permanentRedirect(locale === "en" ? path : `/${locale}${path}`);
  const plans = product.category === "HOSTING" ? await publicPlans() : [];
  const plan = plans.find((row) => row.slug === product.hostingPlanSlug);
  const t = await getTranslations({ locale, namespace: "productPurchase" });
  const url = absoluteUrl(locale === "en" ? path : `/${locale}${path}`);
  return (
    <MarketingShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Vexira Host", path: locale === "en" ? "/" : `/${locale}` },
            { name: product.name, path: locale === "en" ? path : `/${locale}${path}` },
          ]),
          {
            "@type": "Product",
            name: product.name,
            description: t("seoDescription", { name: product.name }),
            url,
            sku: product.id,
            brand: { "@type": "Brand", name: "Vexira Host" },
            ...(!product.requiresQuote
              ? {
                  offers: {
                    "@type": "Offer",
                    price: product.price,
                    priceCurrency: product.currency,
                    availability: "https://schema.org/InStock",
                    url,
                  },
                }
              : {}),
          },
        ]}
      />
      <ProductConfigurator initialProduct={product} plan={plan} />
    </MarketingShell>
  );
}
