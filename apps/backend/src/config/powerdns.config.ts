import { registerAs } from "@nestjs/config";

export const powerDnsConfig = registerAs("powerdns", () => ({
  apiUrl: process.env.POWERDNS_API_URL ?? "",
  apiKey: process.env.POWERDNS_API_KEY ?? "",
  serverId: process.env.POWERDNS_SERVER_ID ?? "localhost",
  nameservers: (process.env.AUTHORITATIVE_NAMESERVERS ?? "ns1.vexirahost.com,ns2.vexirahost.com")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean),
}));

export type PowerDnsConfig = ReturnType<typeof powerDnsConfig>;
