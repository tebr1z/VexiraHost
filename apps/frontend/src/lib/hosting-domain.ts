export type HostingDomainMode = "register" | "transfer" | "existing";
export interface HostingDomainChoice {
  name: string;
  mode: HostingDomainMode;
  price: number;
  currency: string;
}
export const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
export function normalizeHostingDomain(name: string) {
  return name.trim().toLowerCase();
}
export function isValidHostingDomain(name: string) {
  return name.length <= 253 && DOMAIN_PATTERN.test(name);
}
export function hostingDomainMetadata(item: {
  category?: string;
  primaryDomain?: string;
  domainChoice?: HostingDomainChoice;
}) {
  return item.category === "HOSTING"
    ? {
        primaryDomain: normalizeHostingDomain(item.primaryDomain ?? ""),
        domainMode: item.domainChoice?.mode ?? "existing",
      }
    : {};
}
