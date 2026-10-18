import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { assertStorageKey } from "../storage-key.util";
import type { StorageFile, StorageProvider, UploadOptions } from "../storage.interface";

export type S3CompatibleOptions = {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  signedUrlTtlSeconds?: number;
};

export function requireS3Options(
  name: string,
  options: Partial<S3CompatibleOptions>,
): S3CompatibleOptions {
  const missing = (["bucket", "region", "accessKey", "secretKey"] as const).filter(
    (key) => !options[key]?.trim(),
  );
  if (missing.length) throw new Error(`${name} storage config missing: ${missing.join(", ")}`);
  return options as S3CompatibleOptions;
}

export class S3CompatibleStorage implements StorageProvider {
  private readonly client: S3Client;
  private readonly ttl: number;

  constructor(
    private readonly options: S3CompatibleOptions,
    client?: S3Client,
  ) {
    const config: S3ClientConfig = {
      region: options.region,
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      ...(options.forcePathStyle ? { forcePathStyle: true } : {}),
    };
    this.client = client ?? new S3Client(config);
    this.ttl = Math.min(86_400, Math.max(60, options.signedUrlTtlSeconds ?? 900));
  }

  async upload(options: UploadOptions): Promise<StorageFile> {
    const key = assertStorageKey(options.key);
    const body = Buffer.isBuffer(options.body)
      ? options.body
      : Buffer.from(await new Response(options.body).arrayBuffer());
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: options.mimeType,
        Metadata: options.metadata,
      }),
    );
    return { key, size: body.length, mimeType: options.mimeType, url: await this.getUrl(key) };
  }

  async download(rawKey: string): Promise<Buffer> {
    const key = assertStorageKey(rawKey);
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Storage object body is empty: ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(rawKey: string): Promise<void> {
    const key = assertStorageKey(rawKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  async getUrl(rawKey: string): Promise<string> {
    const key = assertStorageKey(rawKey);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn: this.ttl },
    );
  }

  async exists(rawKey: string): Promise<boolean> {
    const key = assertStorageKey(rawKey);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }));
      return true;
    } catch (error) {
      const status =
        typeof error === "object" && error && "$metadata" in error
          ? (error.$metadata as { httpStatusCode?: number }).httpStatusCode
          : undefined;
      const name = error instanceof Error ? error.name : "";
      if (status === 404 || name === "NotFound" || name === "NoSuchKey") return false;
      throw error;
    }
  }
}
