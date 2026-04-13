FROM node:23-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy dependency files first for better layer caching
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Dummy env vars for Next.js build (page data collection loads server modules)
# These are NOT real secrets, just placeholders to satisfy module validation at build time
# hadolint ignore=DL3044
ENV POSTGRES_URL="postgres://user:pass@localhost:5432/dummy" \
    BETTER_AUTH_SECRET="dummy-build-secret-32chars-ok!!" \
    R2_ACCOUNT_ID="dummy" \
    R2_ACCESS_KEY_ID="dummy" \
    R2_SECRET_ACCESS_KEY="dummy" \
    R2_BUCKET_NAME="dummy" \
    ALTCHA_HMAC_KEY="dummy"

# NEXT_PUBLIC_* vars are inlined at build time by Next.js, so they must be
# provided as build args (--build-arg) and converted to ENV before `next build`.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Makes the next output standalone
# https://github.com/vercel/next.js/discussions/65511
ENV NEXT_STANDALONE_OUTPUT="true"

RUN pnpm build

FROM node:23-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migrations content
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
CMD ["node", "server.js"]
