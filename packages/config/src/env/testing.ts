import { z } from "zod";

import { baseEnvSchema } from "./schema.js";

/**
 * Testing environment configuration.
 */
export const testingEnvSchema = baseEnvSchema.extend({
  NODE_ENV: z.literal("testing"),
});

export type TestingEnv = z.infer<typeof testingEnvSchema>;

export function loadTestingEnv(
  env: Record<string, string | undefined> = process.env,
): TestingEnv {
  return testingEnvSchema.parse(env);
}
