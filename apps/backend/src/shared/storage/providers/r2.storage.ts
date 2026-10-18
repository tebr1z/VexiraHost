import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { StorageFile, StorageProvider, UploadOptions } from "../storage.interface";

import { requireS3Options, S3CompatibleStorage } from "./s3-compatible.storage";

/**
 * Cloudflare R2 provider using its S3-compatible API.
 */
@Injectable()
export class R2StorageProvider implements StorageProvider {
  private storage: S3CompatibleStorage | null = null;

  constructor(private readonly config: ConfigService) {}

  private client(): S3CompatibleStorage {
    if (this.storage) return this.storage;
    const accountId = this.config.get<string>("storage.r2.accountId", "").trim();
    const options = requireS3Options("R2", {
      bucket: this.config.get<string>("storage.r2.bucket"),
      region: "auto",
      accessKey: this.config.get<string>("storage.r2.accessKey"),
      secretKey: this.config.get<string>("storage.r2.secretKey"),
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      signedUrlTtlSeconds: this.config.get<number>("storage.signedUrlTtlSeconds", 900),
    });
    if (!accountId) throw new Error("R2 storage config missing: accountId");
    return (this.storage = new S3CompatibleStorage(options));
  }

  upload(options: UploadOptions): Promise<StorageFile> {
    return this.client().upload(options);
  }

  download(key: string): Promise<Buffer> {
    return this.client().download(key);
  }

  delete(key: string): Promise<void> {
    return this.client().delete(key);
  }

  getUrl(key: string): Promise<string> {
    return this.client().getUrl(key);
  }

  exists(key: string): Promise<boolean> {
    return this.client().exists(key);
  }
}
