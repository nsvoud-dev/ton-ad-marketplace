# TON Ad Marketplace

A decentralized advertising marketplace for Telegram channels powered by TON blockchain. Connect advertisers with channel owners, pay in TON, and automate post publication with built-in escrow protection.

## Overview

TON Ad Marketplace revolutionizes how advertisers discover channels and how channel owners monetize their audience. Payments flow through TON wallets with unique escrow addresses per deal, ensuring security for both parties. Integrated with Telegram Mini Apps for a seamless in-app experience.

**Flow:** Advertiser pays → Escrow Wallet → Owner notified → Draft approved → Post published → Verification → Payout

## Tech Stack

| Layer    | Technologies                          |
| -------- | ------------------------------------- |
| Frontend | Next.js 16, React, TON Connect UI      |
| Backend  | Fastify, Prisma ORM                   |
| Database | PostgreSQL                            |
| Auth     | Telegram WebApp initData, JWT         |
| Payments | TON, TonConnect, deterministic escrow |
| Bot      | Telegraf (notifications, messaging)   |

## How It Works

```
Advertiser                    Marketplace                    Channel Owner
    │                              │                                │
    │  1. Submit campaign          │                                │
    │ ──────────────────────────► │                                │
    │                              │  2. Owner accepts/rejects      │
    │                              │ ◄─────────────────────────────│
    │  3. Create deal, pay TON     │                                │
    │ ──────────────────────────► │  (unique escrow per deal)      │
    │                              │  4. Notify owner               │
    │                              │ ──────────────────────────────►│
    │                              │  5. Owner uploads draft        │
    │                              │ ◄─────────────────────────────│
    │  6. Approve draft            │                                │
    │ ──────────────────────────► │                                │
    │                              │  7. Post published to channel  │
    │                              │ ──────────────────────────────►│
    │                              │  8. Verify after 24h           │
    │                              │  9. Payout to owner            │
```

## Local Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL
- [Telegram Bot Token](https://t.me/BotFather)
- [Telegram API credentials](https://my.telegram.org/apps) (for channel stats)

### Installation

```bash
git clone <repository-url>
cd TG_app
npm install
```

### Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` — Bot token from BotFather
- `JWT_SECRET` — Secret for JWT signing
- `TON_ESCROW_MNEMONIC` — Mnemonic for per-deal escrow addresses

Optional (channel stats via GramJS):

- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_MTProto_SESSION`

### Database

```bash
npm run db:generate
npm run db:push
```

### Run

```bash
# All services (backend, frontend, bot)
npm run dev

# Or separately
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:3000
npm run dev:bot
```

## Deployment

| Service   | Suggested platform      | Notes                                              |
| --------- | ----------------------- | -------------------------------------------------- |
| Backend   | Railway / Render / VPS  | Node.js, port 3001, `DATABASE_URL` required        |
| Frontend  | Vercel / Netlify        | Set `NEXT_PUBLIC_API_URL`, manifest URL, TON network |
| Database  | Railway Postgres / Supabase |                                                    |
| Bot       | Railway / VPS           | `TELEGRAM_BOT_TOKEN`, `API_URL`                    |

**Live Demo (placeholders):**

- App: `https://your-app.vercel.app` _(add your URL)_
- API: `https://your-api.railway.app` _(add your URL)_

## Project Structure

```
TG_app/
├── frontend/     # Next.js Mini App
├── backend/      # Fastify API + Prisma
├── bot/          # Telegraf bot
├── scripts/      # GramJS session helper
└── prisma/       # Schema & migrations
```

## License

MIT
