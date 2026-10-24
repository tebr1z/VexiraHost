import { BadRequestException } from "@nestjs/common";

import { decryptSecret, type EncryptedSecretState } from "@/utils/crypto.util";

export const DEPLOY_ENV_RECOVERY_MESSAGE =
  "Stored application environment variables cannot be decrypted with the active HOSTING_CREDENTIALS_KEY. Open this application's Environment settings, re-enter the complete .env values, and choose Save & redeploy. Restore the original encryption key if you need to recover the old values.";

export function readDeploymentEnv(payload?: string | null): {
  state: EncryptedSecretState;
  envVars: Record<string, string> | null;
} {
  if (!payload) return { state: "missing", envVars: {} };
  try {
    const parsed: unknown = JSON.parse(decryptSecret(payload));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.values(parsed).some((value) => typeof value !== "string")
    ) {
      return { state: "unreadable", envVars: null };
    }
    return { state: "readable", envVars: parsed as Record<string, string> };
  } catch {
    return { state: "unreadable", envVars: null };
  }
}

export function requireDeploymentEnv(payload?: string | null): Record<string, string> {
  const result = readDeploymentEnv(payload);
  if (result.envVars === null) {
    throw new BadRequestException({
      code: "DEPLOY_ENV_UNREADABLE",
      message: DEPLOY_ENV_RECOVERY_MESSAGE,
    });
  }
  return result.envVars;
}
