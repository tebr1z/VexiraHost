import { z } from "zod";

import { baseEnvSchema } from "./schema.js";

/**
 * Development environment configuration.
 */
export const developmentEnvSchema = baseEnvSchema.extend({
  NODE_ENV: z.literal("development"),
});

export type DevelopmentEnv = z.infer<typeof developmentEnvSchema>;

export function loadDevelopmentEnv(
  env: Record<string, string | undefined> = process.env,
): DevelopmentEnv {
  return developmentEnvSchema.parse(env);
}
