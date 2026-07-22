import { z } from "zod";

import { baseEnvSchema } from "./schema.js";

/**
 * Production environment configuration.
 */
export const productionEnvSchema = baseEnvSchema.extend({
  NODE_ENV: z.literal("production"),
});

export type ProductionEnv = z.infer<typeof productionEnvSchema>;

export function loadProductionEnv(
  env: Record<string, string | undefined> = process.env,
): ProductionEnv {
  return productionEnvSchema.parse(env);
}
