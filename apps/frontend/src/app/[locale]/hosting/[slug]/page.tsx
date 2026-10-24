import {
  ProductPage,
  productMetadata,
  type ProductPageProps,
} from "@/components/catalog/product-page";
export const generateMetadata = (props: ProductPageProps) => productMetadata(props, true);
export default function Page(props: ProductPageProps) {
  return <ProductPage {...props} hosting={true} />;
}
