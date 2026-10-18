import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { StorageFile, StorageProvider, UploadOptions } from "../storage.interface";

import { requireS3Options, S3CompatibleStorage } from "./s3-compatible.storage";

/**
 * AWS S3 provider with private objects and short-lived download URLs.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private storage: S3CompatibleStorage | null = null;

  constructor(private readonly config: ConfigService) {}

  private client(): S3CompatibleStorage {
    if (this.storage) return this.storage;
    const options = requireS3Options("S3", {
      bucket: this.config.get<string>("storage.s3.bucket"),
      region: this.config.get<string>("storage.s3.region"),
      accessKey: this.config.get<string>("storage.s3.accessKey"),
      secretKey: this.config.get<string>("storage.s3.secretKey"),
      endpoint: this.config.get<string>("storage.s3.endpoint"),
      forcePathStyle: this.config.get<boolean>("storage.s3.forcePathStyle", false),
      signedUrlTtlSeconds: this.config.get<number>("storage.signedUrlTtlSeconds", 900),
    });
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
