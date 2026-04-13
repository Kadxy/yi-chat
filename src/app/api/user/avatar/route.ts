import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSession, auth } from "auth/server";
import { getFileStorage } from "lib/file-storage";
import { updateUserDetails } from "lib/user/server";
import { headers } from "next/headers";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", "[Avatar Upload API]"),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_SIZE = 256;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;

  if (!file || !userId) {
    return NextResponse.json(
      { error: "Missing file or userId" },
      { status: 400 },
    );
  }

  // Permission check: only self or admin
  const isOwnResource = session.user.id === userId;
  if (!isOwnResource && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate content type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB" },
      { status: 400 },
    );
  }

  try {
    // Read file buffer and process with sharp
    const arrayBuffer = await file.arrayBuffer();
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    // Upload to R2
    const result = await getFileStorage().upload(processedBuffer, {
      filename: `avatar-${userId}.webp`,
      contentType: "image/webp",
    });

    // Update database
    if (isOwnResource) {
      await auth.api.updateUser({
        returnHeaders: true,
        body: { image: result.sourceUrl },
        headers: await headers(),
      });
    } else {
      await updateUserDetails(userId, undefined, undefined, result.sourceUrl);
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.sourceUrl,
    });
  } catch (error) {
    logger.error("Avatar upload failed", error);
    return NextResponse.json(
      { error: "Failed to process and upload avatar" },
      { status: 500 },
    );
  }
}
