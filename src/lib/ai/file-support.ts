/**
 * MIME types that can be sent as native file parts to LLM providers.
 * These are types the model can directly process (images, PDFs, etc.).
 */
export const DEFAULT_FILE_PART_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const ANTHROPIC_FILE_MIME_TYPES = [
  ...DEFAULT_FILE_PART_MIME_TYPES,
] as const;

const DEFAULT_FILE_PART_MIME_SET = new Set<string>(
  DEFAULT_FILE_PART_MIME_TYPES,
);

/**
 * File extensions that are blocked from upload for security reasons.
 */
const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  "exe",
  "msi",
  "dll",
  "scr",
  "com",
  "cmd",
  "bat",
  "ps1",
  "vbs",
  "wsf",
  "jar",
  "app",
  "dmg",
  "iso",
  "img",
]);

export const isUploadBlocked = (filename: string): boolean => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return BLOCKED_UPLOAD_EXTENSIONS.has(ext);
};

export const INGEST_SUPPORTED_MIME = new Set<string>([
  "text/csv",
  "application/csv",
]);

/**
 * Check if a MIME type is natively supported by the model as a file part.
 * Files not supported here will be uploaded as source-url and read via tools.
 */
export const isFilePartSupported = (
  mime?: string,
  supportedMimeTypes?: readonly string[],
) => {
  if (!mime) return false;
  if (supportedMimeTypes !== undefined) {
    return supportedMimeTypes.includes(mime);
  }
  return DEFAULT_FILE_PART_MIME_SET.has(mime);
};

export const isIngestSupported = (mime?: string) =>
  !!mime && INGEST_SUPPORTED_MIME.has(mime);
