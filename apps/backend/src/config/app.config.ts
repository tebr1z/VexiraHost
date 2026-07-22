import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  name: process.env.APP_NAME ?? "Vexira Host",
  url: process.env.APP_URL ?? "http://localhost:3000",
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: process.env.CORS_ORIGINS ?? "http://localhost:3000",
  logLevel: process.env.LOG_LEVEL ?? "info",
}));

export type AppConfig = ReturnType<typeof appConfig>;
