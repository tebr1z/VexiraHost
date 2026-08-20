import { registerAs } from "@nestjs/config";

function requireJwtSecret(name: string, value: string | undefined): string {
  const secret = value?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error(
      `${name} must be a random string of at least 32 characters. Refusing to start with a weak or missing JWT secret.`,
    );
  }
  return secret;
}

export const jwtConfig = registerAs("jwt", () => ({
  accessSecret: requireJwtSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET),
  refreshSecret: requireJwtSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET),
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
}));

export type JwtConfig = ReturnType<typeof jwtConfig>;
