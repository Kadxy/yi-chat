import type { BetterAuthPlugin } from "better-auth";
import { verifyCaptchaPayload } from "./server";

const CAPTCHA_HEADER = "x-altcha-payload";

const DEFAULT_PROTECTED_ENDPOINTS = ["/email-otp/send-verification-otp"];

export const altchaCaptcha = (options?: {
  endpoints?: string[];
}): BetterAuthPlugin => ({
  id: "altcha-captcha",
  onRequest: async (request) => {
    const protectedEndpoints =
      options?.endpoints ?? DEFAULT_PROTECTED_ENDPOINTS;

    const isProtected = protectedEndpoints.some((endpoint) =>
      request.url.includes(endpoint),
    );

    if (!isProtected) {
      return undefined;
    }

    const payload = request.headers.get(CAPTCHA_HEADER);

    if (!payload) {
      return {
        response: new Response(
          JSON.stringify({ message: "Captcha payload required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      };
    }

    const isValid = await verifyCaptchaPayload(payload);

    if (!isValid) {
      return {
        response: new Response(
          JSON.stringify({ message: "Captcha verification failed" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      };
    }

    return undefined;
  },
});
