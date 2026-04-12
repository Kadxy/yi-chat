import { createHmac } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
  UploadUrl,
  UploadUrlOptions,
} from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
} from "./storage-utils";
import { FileNotFoundError } from "lib/errors";
import { generateUUID } from "lib/utils";

const STORAGE_PREFIX = resolveStoragePrefix();

const required = (name: string, value: string | undefined) => {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
};

const buildKey = (filename: string) => {
  const safeName = sanitizeFilename(filename || "file");
  const id = generateUUID();
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : "";
  return path.posix.join(prefix, `${id}-${safeName}`);
};

const buildPublicUrl = (
  key: string,
  publicBaseUrl?: string,
  endpoint?: string,
  bucket?: string,
) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${encodeURI(key)}`;
  }
  // Fallback: construct from endpoint
  if (endpoint && bucket) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;
  }
  return `/${encodeURI(key)}`;
};

export const createS3FileStorage = (): FileStorage => {
  const bucket = required("R2_BUCKET_NAME", process.env.R2_BUCKET_NAME);
  const accountId = required("R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID);
  const accessKeyId = required(
    "R2_ACCESS_KEY_ID",
    process.env.R2_ACCESS_KEY_ID,
  );
  const secretAccessKey = required(
    "R2_SECRET_ACCESS_KEY",
    process.env.R2_SECRET_ACCESS_KEY,
  );
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const publicBaseUrl = process.env.R2_PUBLIC_URL;
  const region = "auto";

  const s3 = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    async upload(content, options: UploadOptions = {}) {
      const buffer = await toBuffer(content);
      const filename = options.filename ?? "file";
      const key = buildKey(filename);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: options.contentType,
          ACL: undefined, // rely on bucket policy for public/private
        }),
      );

      const metadata: FileMetadata = {
        key,
        filename: path.posix.basename(key),
        contentType: options.contentType || "application/octet-stream",
        size: buffer.byteLength,
        uploadedAt: new Date(),
      };

      const sourceUrl = buildPublicUrl(key, publicBaseUrl, endpoint, bucket);

      return { key, sourceUrl, metadata };
    },

    async createUploadUrl(
      options: UploadUrlOptions,
    ): Promise<UploadUrl | null> {
      const key = buildKey(options.filename);
      const expires = Math.max(
        60,
        Math.min(60 * 60 * 12, options.expiresInSeconds ?? 900),
      );

      const workerUrl = process.env.R2_UPLOAD_WORKER_URL;
      const uploadSecret = process.env.R2_UPLOAD_SECRET;

      let url: string;

      if (workerUrl && uploadSecret) {
        // Worker mode: generate HMAC-signed URL pointing to the Worker
        const expiresMs = String(Date.now() + expires * 1000);
        const token = createHmac("sha256", uploadSecret)
          .update(`PUT:${key}:${expiresMs}`)
          .digest("hex");
        url = `${workerUrl.replace(/\/$/, "")}/${encodeURI(key)}?token=${token}&expires=${expiresMs}`;
      } else {
        // Fallback: S3 presigned URL (direct R2 access)
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: options.contentType,
        });
        url = await getSignedUrl(s3, command, { expiresIn: expires });
      }

      return {
        key,
        url,
        method: "PUT",
        expiresAt: new Date(Date.now() + expires * 1000),
        headers: { "Content-Type": options.contentType },
      };
    },

    async download(key) {
      try {
        const res = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        const body = res.Body;
        if (!body) throw new FileNotFoundError(key);
        const stream = body as unknown as NodeJS.ReadableStream;
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          stream.on("data", (c) =>
            chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
          );
          stream.once("end", () => resolve());
          stream.once("error", (e) => reject(e));
        });
        return Buffer.concat(chunks);
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) {
          throw new FileNotFoundError(key, error);
        }
        throw error;
      }
    },

    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async exists(key) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) return false;
        return false;
      }
    },

    async getMetadata(key) {
      try {
        const res = await s3.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return {
          key,
          filename: path.posix.basename(key),
          contentType: res.ContentType || "application/octet-stream",
          size: Number(res.ContentLength || 0),
          uploadedAt: res.LastModified ?? undefined,
        } satisfies FileMetadata;
      } catch (error: unknown) {
        if ((error as any)?.$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },

    async getSourceUrl(key) {
      return buildPublicUrl(key, publicBaseUrl, endpoint, bucket);
    },

    async getDownloadUrl(key) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return url;
    },
  } satisfies FileStorage;
};
