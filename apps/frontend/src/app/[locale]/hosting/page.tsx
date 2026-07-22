import { MarketingShell } from "@/components/layout/marketing-shell";
import { CmsPageView } from "@/components/cms/cms-page-view";

export default function PublicHostingPage(): React.ReactElement {
  return (
    <MarketingShell>
      <CmsPageView slug="hosting" />
    </MarketingShell>
  );
}
