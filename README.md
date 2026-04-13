# Yi Chat

Low-cost Claude API-powered AI assistant platform.

## Features

- Claude models (Haiku / Sonnet / Opus) with extended thinking
- Remote MCP server integration with OAuth
- File upload & ingestion (images, PDF, Word, Excel, CSV)
- Chat sharing & archiving
- Credit-based usage billing
- i18n (中文 / English / 日本語 / 한국어 / Français / Español / Norsk)
- Google OAuth & Email OTP authentication
- Admin panel with redemption codes

## Tech Stack

Next.js 16 · React 19 · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · Vercel AI SDK · Better Auth · Cloudflare R2

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL

### Setup

```bash
pnpm install
cp .env.example .env  # Fill in your config
pnpm db:push
pnpm dev
```

The dev server will start at `http://localhost:3030`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `POSTGRES_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`npx @better-auth/cli@latest secret`) |
| `BETTER_AUTH_URL` | Yes | App URL (e.g. `https://yi.chat`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `R2_*` | No | Cloudflare R2 file storage |
| `ALTCHA_HMAC_KEY` | No | ALTCHA captcha |

### Docker

```bash
# Copy env to docker directory
cp .env docker/.env

# Start with Docker Compose
pnpm docker-compose:up
```

The app will be available at `http://localhost:3000`.

## License

MIT
