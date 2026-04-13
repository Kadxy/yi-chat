import "server-only";

import { createChallenge, verifySolution } from "altcha-lib";
import type { Challenge, Payload } from "altcha-lib/types";

export type CaptchaChallenge = Challenge;

const DEFAULT_MAX_NUMBER = 100_000;

const HMAC_KEY = process.env.ALTCHA_HMAC_KEY;
if (!HMAC_KEY) {
  throw new Error("ALTCHA_HMAC_KEY environment variable is required");
}
const hmacKey: string = HMAC_KEY;

const configMaxNumber = process.env.ALTCHA_MAX_NUMBER;
const parsedMaxNumber = configMaxNumber
  ? parseInt(configMaxNumber, 10)
  : DEFAULT_MAX_NUMBER;
const maxNumber =
  Number.isNaN(parsedMaxNumber) || parsedMaxNumber <= 0
    ? DEFAULT_MAX_NUMBER
    : parsedMaxNumber;

export async function generateCaptchaChallenge(): Promise<CaptchaChallenge> {
  return createChallenge({
    hmacKey,
    maxNumber,
  });
}

export async function verifyCaptchaPayload(payload: string): Promise<boolean> {
  try {
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as Payload;
    return verifySolution(parsed, hmacKey, true);
  } catch {
    return false;
  }
}
