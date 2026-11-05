# Yi Chat

A self-hosted web chat app for Anthropic Claude models, built with Next.js. It includes user accounts, remote MCP tool integration, file handling, chat sharing, token-based credit accounting, and an admin panel.

> This project is no longer maintained.

## Features

- Claude models (Haiku / Sonnet / Opus) with extended thinking
- Built-in tools: web search, academic search, HTTP fetch, charts and tables, JavaScript / Python execution in the browser, file reading and creation
- Remote MCP server integration with OAuth
- File upload & ingestion (images, PDF, Word, Excel, CSV, Jupyter notebooks)
- Chat sharing & archiving
- Credit accounting based on per-model token usage, with plans and redemption codes
- Email OTP and Google OAuth sign-in, with ALTCHA captcha
- Admin panel for users, chat history, and redemption codes
- i18n (中文 / English / 日本語 / 한국어 / Français / Español / Norsk)
- PWA support

## Tech Stack

Next.js 16 · React 19 · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · Vercel AI SDK · Better Auth · Cloudflare R2

## Getting Started

### Prerequisites

- Node.js >= 20.9
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
| `ANTHROPIC_API_BASE_URL` | No | Custom Anthropic API base URL |
| `POSTGRES_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`npx @better-auth/cli@latest secret`) |
| `BETTER_AUTH_URL` | Yes | Public URL of the app |
| `ALTCHA_HMAC_KEY` | Yes | HMAC key for the sign-in captcha |
| `RESEND_API_KEY` / `RESEND_DOMAIN` | Yes | Resend credentials and sender domain for email OTP |
| `ADMIN_EMAIL` | No | Email that is granted the admin role on sign-up |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `R2_*` | No | Cloudflare R2 file storage (required for file uploads) |
| `JINA_API_KEY` | No | Jina API key for web search |

See `.env.example` for the full list.

### Docker

```bash
# Copy env to docker directory
cp .env docker/.env

# Start with Docker Compose
pnpm docker-compose:up
```

The app will be available at `http://localhost:3000`.

### R2 Upload Worker

`worker/r2-upload` is an optional Cloudflare Worker that accepts signed uploads into the R2 bucket, for deployments where the R2 S3 API is not reachable from the client. Set `R2_UPLOAD_WORKER_URL` and `R2_UPLOAD_SECRET` to use it.

## License

MIT
