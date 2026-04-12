/**
 * Standardized error codes for chat API responses.
 * Frontend checks for these codes to show localized messages.
 */
export const CHAT_ERROR_CODE = {
  INSUFFICIENT_CREDITS: "YI_CHAT_INSUFFICIENT_CREDITS",
  MODEL_NOT_ALLOWED: "YI_CHAT_MODEL_NOT_ALLOWED",
} as const;

export type ChatErrorCode =
  (typeof CHAT_ERROR_CODE)[keyof typeof CHAT_ERROR_CODE];

/**
 * Check if a string contains one of our error codes
 */
export function parseChatErrorCode(message: string): ChatErrorCode | null {
  for (const code of Object.values(CHAT_ERROR_CODE)) {
    if (message.includes(code)) return code;
  }
  return null;
}
