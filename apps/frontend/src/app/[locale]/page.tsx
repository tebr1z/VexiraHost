import {
  HeroSection,
  InfrastructureSection,
  PricingSection,
  TestimonialsSection,
} from "@/components/landing";
import { MarketingShell } from "@/components/layout/marketing-shell";

export default function HomePage(): React.ReactElement {
  return (
    <MarketingShell>
      <HeroSection />
      <PricingSection />
      <InfrastructureSection />
      <TestimonialsSection />
    </MarketingShell>
  );
}
