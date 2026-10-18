import { registerAs } from "@nestjs/config";

export type StorageDriver = "local" | "s3" | "r2";

export const storageConfig = registerAs("storage", () => ({
  driver: (process.env.STORAGE_DRIVER ?? "local") as StorageDriver,
  localPath: process.env.STORAGE_LOCAL_PATH ?? "./storage",
  signedUrlTtlSeconds: Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 900),
  s3: {
    bucket: process.env.STORAGE_S3_BUCKET,
    region: process.env.STORAGE_S3_REGION,
    accessKey: process.env.STORAGE_S3_ACCESS_KEY,
    secretKey: process.env.STORAGE_S3_SECRET_KEY,
    endpoint: process.env.STORAGE_S3_ENDPOINT,
    forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
  },
  r2: {
    bucket: process.env.STORAGE_R2_BUCKET,
    accountId: process.env.STORAGE_R2_ACCOUNT_ID,
    accessKey: process.env.STORAGE_R2_ACCESS_KEY,
    secretKey: process.env.STORAGE_R2_SECRET_KEY,
  },
}));

export type StorageConfig = ReturnType<typeof storageConfig>;
