import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import { serverFileStorage } from "lib/file-storage";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";
import { checkStorageAction } from "../actions";
import { DEFAULT_FILE_PART_MIME_TYPES } from "lib/ai/file-support";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", "[S3 Upload URL API]"),
});

const DEFAULT_UPLOAD_EXPIRES_SECONDS = 3600; // 1 hour

const ALLOWED_CONTENT_TYPES = new Set<string>(DEFAULT_FILE_PART_MIME_TYPES);

interface UploadUrlRequest {
  filename?: string;
  contentType?: string;
}

/**
 * Upload URL endpoint.
 * Returns a presigned S3 URL for direct client upload.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storageCheck = await checkStorageAction();
  if (!storageCheck.isValid) {
    logger.error("Storage configuration error", {
      error: storageCheck.error,
      solution: storageCheck.solution,
    });
    return NextResponse.json(
      { error: storageCheck.error, solution: storageCheck.solution },
      { status: 500 },
    );
  }

  let body: UploadUrlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentType = body.contentType || "application/octet-stream";

  // Validate content type against whitelist
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${contentType}`,
        allowedTypes: [...ALLOWED_CONTENT_TYPES],
      },
      { status: 400 },
    );
  }

  try {
    const uploadUrl = await serverFileStorage.createUploadUrl!({
      filename: body.filename || "file",
      contentType,
      expiresInSeconds: DEFAULT_UPLOAD_EXPIRES_SECONDS,
    });

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 },
      );
    }

    const sourceUrl = await serverFileStorage.getSourceUrl(uploadUrl.key);

    return NextResponse.json({
      ...uploadUrl,
      sourceUrl,
    });
  } catch (error) {
    logger.error("Upload URL generation failed", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
