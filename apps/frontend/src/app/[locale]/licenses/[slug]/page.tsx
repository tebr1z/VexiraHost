import { CmsPageView } from "@/components/cms/cms-page-view";
import { MarketingShell } from "@/components/layout/marketing-shell";

export default async function LicenseSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;

  return (
    <MarketingShell>
      <CmsPageView pathSegment={slug} />
    </MarketingShell>
  );
}
