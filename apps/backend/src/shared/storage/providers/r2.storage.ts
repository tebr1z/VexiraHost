import { Injectable } from "@nestjs/common";

import type { StorageFile, StorageProvider, UploadOptions } from "../storage.interface";

/**
 * Cloudflare R2 storage provider — architecture scaffold.
 * Implement R2 SDK integration when needed.
 */
@Injectable()
export class R2StorageProvider implements StorageProvider {
  async upload(_options: UploadOptions): Promise<StorageFile> {
    throw new Error("R2 storage provider not implemented");
  }

  async download(_key: string): Promise<Buffer> {
    throw new Error("R2 storage provider not implemented");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("R2 storage provider not implemented");
  }

  async getUrl(_key: string): Promise<string> {
    throw new Error("R2 storage provider not implemented");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("R2 storage provider not implemented");
  }
}
