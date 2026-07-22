import { registerAs } from "@nestjs/config";

export const registrarConfig = registerAs("registrar", () => ({
  provider: process.env.REGISTRAR_PROVIDER ?? "mock",
}));

export type RegistrarConfig = ReturnType<typeof registrarConfig>;
