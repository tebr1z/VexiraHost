import { CloudNavLoader } from "@/components/layout/cloud-nav-loader";

export default function LocaleLoading(): React.ReactElement {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 pt-[calc(4.25rem+env(safe-area-inset-top))]">
      <CloudNavLoader fullPage />
    </div>
  );
}
