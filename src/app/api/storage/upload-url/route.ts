import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import { getFileStorage } from "lib/file-storage";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";
import { isUploadBlocked } from "lib/ai/file-support";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", "[S3 Upload URL API]"),
});

const DEFAULT_UPLOAD_EXPIRES_SECONDS = 3600; // 1 hour

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

  let body: UploadUrlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentType = body.contentType || "application/octet-stream";

  // Block potentially dangerous file types
  if (body.filename && isUploadBlocked(body.filename)) {
    return NextResponse.json(
      { error: `File type not allowed: ${body.filename}` },
      { status: 400 },
    );
  }

  try {
    const uploadUrl = await getFileStorage().createUploadUrl!({
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

    const sourceUrl = await getFileStorage().getSourceUrl(uploadUrl.key);

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
