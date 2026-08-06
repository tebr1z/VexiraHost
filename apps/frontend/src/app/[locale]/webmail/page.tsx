import { CmsPageView } from "@/components/cms/cms-page-view";
import { MarketingShell } from "@/components/layout/marketing-shell";

export default function WebmailPage(): React.ReactElement {
  return (
    <MarketingShell>
      <CmsPageView slug="webmail" />
    </MarketingShell>
  );
}
