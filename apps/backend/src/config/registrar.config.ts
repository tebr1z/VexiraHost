import { registerAs } from "@nestjs/config";

export const registrarConfig = registerAs("registrar", () => ({
  provider: process.env.REGISTRAR_PROVIDER ?? "mock",
  namesilo: {
    apiKey: process.env.NAMESILO_API_KEY ?? "",
    apiBaseUrl: process.env.NAMESILO_API_BASE_URL ?? "https://www.namesilo.com/api",
    contactId: process.env.NAMESILO_CONTACT_ID ?? "",
    defaultNameservers: (
      process.env.NAMESILO_DEFAULT_NAMESERVERS ?? "ns1.vexirahost.com,ns2.vexirahost.com"
    )
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  },
}));

export type RegistrarConfig = ReturnType<typeof registrarConfig>;
