# Yi Chat (yi.chat)

Low-cost Claude API-powered AI assistant platform.

## Setup

```bash
pnpm install
cp .env.example .env  # Fill in your config
pnpm db:push
pnpm dev
```

## Tech Stack

- Next.js + React 19 + Tailwind CSS
- PostgreSQL + Drizzle ORM
- Vercel AI SDK + Anthropic Claude
- Better Auth
- MCP Integration (remote only)
