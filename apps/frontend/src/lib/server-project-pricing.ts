import "server-only";
import type { ProjectPricingDocument } from "@vexira/types";

export async function publicProjectPricing(): Promise<ProjectPricingDocument | null> {
  const base = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/project-pricing`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.data?.config?.schemaVersion !== 1) return null;
    return result.data as ProjectPricingDocument;
  } catch {
    return null;
  }
}
