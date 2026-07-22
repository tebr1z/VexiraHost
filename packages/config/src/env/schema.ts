import { z } from "zod";

/**
 * Base environment schema shared across all runtimes.
 * Extend per-environment in development, testing, and production configs.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "testing", "production"]).default("development"),
  APP_NAME: z.string().default("Vexira Host"),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

export const redisEnvSchema = z.object({
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().url().startsWith("redis://"),
});

export const jwtEnvSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

export const storageEnvSchema = z.object({
  STORAGE_DRIVER: z.enum(["local", "s3", "r2"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage"),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),
  STORAGE_R2_BUCKET: z.string().optional(),
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_ACCESS_KEY: z.string().optional(),
  STORAGE_R2_SECRET_KEY: z.string().optional(),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type JwtEnv = z.infer<typeof jwtEnvSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;
