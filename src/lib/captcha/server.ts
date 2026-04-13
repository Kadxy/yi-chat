import "server-only";

import { createChallenge, verifySolution } from "altcha-lib";
import type { Challenge, Payload } from "altcha-lib/types";

export type CaptchaChallenge = Challenge;

const DEFAULT_MAX_NUMBER = 100_000;

function getHmacKey(): string {
  const key = process.env.ALTCHA_HMAC_KEY;
  if (!key) {
    throw new Error("ALTCHA_HMAC_KEY environment variable is required");
  }
  return key;
}

function getMaxNumber(): number {
  const configMaxNumber = process.env.ALTCHA_MAX_NUMBER;
  const parsed = configMaxNumber
    ? parseInt(configMaxNumber, 10)
    : DEFAULT_MAX_NUMBER;
  return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_MAX_NUMBER : parsed;
}

export async function generateCaptchaChallenge(): Promise<CaptchaChallenge> {
  return createChallenge({
    hmacKey: getHmacKey(),
    maxNumber: getMaxNumber(),
  });
}

export async function verifyCaptchaPayload(payload: string): Promise<boolean> {
  try {
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as Payload;
    return verifySolution(parsed, getHmacKey(), true);
  } catch {
    return false;
  }
}
