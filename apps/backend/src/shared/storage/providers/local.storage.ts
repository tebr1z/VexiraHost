import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { StorageFile, StorageProvider, UploadOptions } from "../storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>("storage.localPath", "./storage");
  }

  async upload(options: UploadOptions): Promise<StorageFile> {
    const filePath = path.join(this.basePath, options.key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const buffer = Buffer.isBuffer(options.body)
      ? options.body
      : Buffer.from(await new Response(options.body).arrayBuffer());

    await fs.writeFile(filePath, buffer);

    return {
      key: options.key,
      size: buffer.length,
      mimeType: options.mimeType,
      url: await this.getUrl(options.key),
    };
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.basePath, key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.basePath, key));
  }

  async getUrl(key: string): Promise<string> {
    return `/storage/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, key));
      return true;
    } catch {
      return false;
    }
  }
}
