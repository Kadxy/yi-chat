interface Env {
  BUCKET: R2Bucket;
  UPLOAD_SECRET: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function respond(body: string | null, status: number) {
  return new Response(body, { status, headers: CORS_HEADERS });
}

async function hmacSign(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return respond(null, 204);
    if (request.method !== "PUT") return respond("Method Not Allowed", 405);

    try {
      const url = new URL(request.url);
      const key = decodeURIComponent(url.pathname.slice(1));
      const token = url.searchParams.get("token");
      const expires = url.searchParams.get("expires");

      if (!key || !token || !expires) return respond("Missing params", 400);

      const expiresMs = parseInt(expires, 10);
      if (Number.isNaN(expiresMs) || Date.now() > expiresMs) {
        return respond("Expired", 403);
      }

      const expected = await hmacSign(
        env.UPLOAD_SECRET,
        `PUT:${key}:${expires}`,
      );
      if (!timingSafeEqual(token, expected))
        return respond("Invalid token", 403);

      const ct =
        request.headers.get("Content-Type") || "application/octet-stream";
      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType: ct },
      });

      return respond("OK", 200);
    } catch (e) {
      return respond(e instanceof Error ? e.message : "Internal Error", 500);
    }
  },
};

export default worker;
