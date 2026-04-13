import { generateCaptchaChallenge } from "lib/captcha/server";
import { rateLimit } from "lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "captcha", {
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const challenge = await generateCaptchaChallenge();
  return NextResponse.json(challenge);
}
