"use server";

interface StorageCheckResult {
  isValid: boolean;
  error?: string;
  solution?: string;
}

/**
 * Check if storage is properly configured.
 * Returns detailed error messages with solutions.
 */
export async function checkStorageAction(): Promise<StorageCheckResult> {
  const missing: string[] = [];
  if (!process.env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  if (!process.env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!process.env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!process.env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing R2 configuration: ${missing.join(", ")}`,
      solution:
        "Add required env vars for Cloudflare R2:\n" +
        "- R2_ACCOUNT_ID\n" +
        "- R2_ACCESS_KEY_ID\n" +
        "- R2_SECRET_ACCESS_KEY\n" +
        "- R2_BUCKET_NAME\n" +
        "(Optional) R2_PUBLIC_URL=https://file.yi.chat",
    };
  }

  return { isValid: true };
}
