export interface StorageFile {
  key: string;
  size: number;
  mimeType?: string;
  url?: string;
}

export interface UploadOptions {
  key: string;
  body: Buffer | ReadableStream;
  mimeType?: string;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  upload(options: UploadOptions): Promise<StorageFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = "STORAGE_PROVIDER";
