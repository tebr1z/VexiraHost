/**
 * Gateway references may contain provider secrets required for server-side
 * verification. API responses expose only the non-secret provider/order id.
 */
export function toPublicGatewayRef(gatewayRef: string | null | undefined): string | null {
  if (!gatewayRef) return null;

  const kapitalMatch = /^kapital:(\d+):/.exec(gatewayRef);
  if (kapitalMatch) {
    return `kapital:${kapitalMatch[1]}`;
  }

  return gatewayRef;
}
