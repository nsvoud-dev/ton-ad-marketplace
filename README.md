# Ton Ad Marketplace

MVP маркетплейса рекламы для Telegram-каналов с escrow на TON.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TON Ad Marketplace                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   Telegram   │     │   Telegram   │     │         Backend              │ │
│  │   Mini App   │────▶│     Bot      │────▶│   Fastify + Prisma           │ │
│  │  (Next.js)   │     │  (Telegraf)  │     │   PostgreSQL                 │ │
│  └──────┬───────┘     └──────────────┘     └──────────────┬───────────────┘ │
│         │                                                  │                 │
│         │ TonConnect UI                                     │ Escrow          │
│         ▼                                                  ▼                 │
│  ┌──────────────┐                                 ┌──────────────────────┐  │
│  │  TON Wallet  │────────────────────────────────▶│  Unique Escrow Addr  │  │
│  │  (TonConnect)│         TON transfer            │  per Deal            │  │
│  └──────────────┘                                 └──────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Модули

| Модуль | Описание |
|--------|----------|
| **Frontend** | Next.js + TonConnect UI. Mini App для рекламодателей и владельцев каналов. |
| **Backend** | Fastify, Prisma, PostgreSQL. API для auth, channels, campaigns, deals, escrow. |
| **Bot** | Telegraf. Messaging, уведомления. Коммуникация идёт через бота, не внутри Mini App. |

### Approval Workflow

1. **Advertiser** отправляет бриф (Campaign) → `POST /api/campaigns`
2. **Owner** принимает или отклоняет → `POST /api/campaigns/:id/accept` | `reject`
3. **Advertiser** создаёт сделку → `POST /api/deals`
4. **Advertiser** вносит TON на escrow → `GET /api/escrow/deal/:dealId`, затем `POST .../confirm-funded`
5. **Owner** загружает черновик → `POST /api/deals/:id/draft`
6. **Advertiser** одобряет или отклоняет черновик → `POST /api/deals/:id/draft/review`
7. Планирование публикации → `POST /api/deals/:id/schedule`
8. Бот публикует пост (автоматизация) и проверяет наличие в канале
9. Выплата Owner или Refund Advertiser

### Escrow (TON)

- **Уникальный адрес на сделку**: из мнемоники генерируется детерминированный кошелёк для каждой Deal. Средства изолированы.

### Схема БД (Prisma)

- **User**: `telegramId`, `role` (Owner|Advertiser), `balanceNano`, `walletAddress`
- **Channel**: `telegramId`, `subscribers`, `views`, `reach`, `languageCharts`, `premiumStats`, `pricePerPostNano`, `isVerified`
- **Campaign**: бриф (title, description, targetAudience, links, budget)
- **Deal**: `status`, `escrowAddress` (уникальный), `draftContentHash` (SHA-256 для проверки целостности), черновик, метаданные поста

---

## Требования

- Node.js >= 18
- PostgreSQL
- Telegram Bot Token (BotFather)
- Telegram API ID / API Hash (для MTProto — статистика каналов)
- TON Escrow Mnemonic (для уникальных адресов на сделку)

---

## Установка и запуск

### 1. Клонирование и зависимости

```bash
git clone <repo>
cd TG_app
npm install
```

### 2. Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Обязательно:
- `DATABASE_URL` — строка подключения PostgreSQL
- `TELEGRAM_BOT_TOKEN` — токен бота
- `JWT_SECRET` — секрет для JWT
- `TON_ESCROW_MNEMONIC` — мнемоника для генерации уникальных escrow-адресов

Для статистики каналов и проверки постов (GramJS/MTProto):
- `TELEGRAM_API_ID` — получить на https://my.telegram.org/apps
- `TELEGRAM_API_HASH` — получить там же
- `TELEGRAM_MTProto_SESSION` — сессия после входа (см. раздел ниже)

### 3. База данных

```bash
npm run db:generate
npm run db:push
# или npm run db:migrate
```

### 4. Запуск

```bash
# Все сервисы
npm run dev

# Отдельно
npm run dev:backend   # :3001
npm run dev:frontend  # :3000
npm run dev:bot
```

---

## Деплой

### Backend (Fastify)

- Рекомендуется: **Docker** или **Node.js** на VPS (PM2, systemd)
- Порт: 3001 (или через reverse proxy)
- База: PostgreSQL (managed или self-hosted)

### Frontend (Next.js)

- Vercel, Netlify или любой хостинг с Node.js
- Переменные: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TON_CONNECT_MANIFEST_URL`, `NEXT_PUBLIC_TON_NETWORK`
- `tonconnect-manifest.json` должен быть доступен по HTTPS

### Bot (Telegraf)

- Запуск на VPS с PM2/systemd
- Переменные: `TELEGRAM_BOT_TOKEN`, `API_URL` (URL бэкенда для будущих webhook/уведомлений)

### Docker (пример)

```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
CMD ["node", "dist/index.js"]
```

### Настройка Mini App в Telegram

1. Создайте бота через @BotFather
2. В BotFather: `/newapp` или настройте Menu Button с URL вашего Mini App
3. URL Mini App — HTTPS-адрес вашего Next.js приложения

### Настройка MTProto (API ID / API Hash) для статистики

Сбор language charts и Premium-статистики каналов требует MTProto (GramJS):

1. Зайдите на https://my.telegram.org/apps
2. Создайте приложение, получите **API ID** и **API Hash**
3. Сгенерируйте сессию — используйте скрипт:

```js
// scripts/gramjs-session.js
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
const apiHash = process.env.TELEGRAM_API_HASH;

async function main() {
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
  await client.start({ phoneNumber: async () => prompt('Phone:'), password: async () => prompt('2FA:'), phoneCode: async () => prompt('Code:') });
  console.log('Session:', client.session.save());
  process.exit(0);
}
main();
```

4. Выполните: `TELEGRAM_API_ID=... TELEGRAM_API_HASH=... node scripts/gramjs-session.js` (из корня проекта)
5. Скопируйте вывод в `TELEGRAM_MTProto_SESSION` в `.env`
6. **Важно**: аккаунт должен быть добавлен админом в каналы, статистику которых нужно получать

---

## API (кратко)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/verify` | Вход по `initData` (Telegram WebApp) |
| GET | `/api/auth/me` | Текущий пользователь |
| GET/POST | `/api/channels` | Каналы владельца |
| GET | `/api/channels/catalog` | Публичный каталог |
| POST | `/api/channels/:id/sync-stats` | Синхронизация статистики (language charts, Premium) |
| GET/POST | `/api/campaigns` | Кампании рекламодателя |
| POST | `/api/campaigns/:id/accept` | Owner принимает кампанию |
| POST | `/api/campaigns/:id/reject` | Owner отклоняет |
| GET/POST | `/api/deals` | Сделки |
| POST | `/api/deals/:id/draft` | Owner загружает черновик |
| POST | `/api/deals/:id/draft/review` | Advertiser одобряет/отклоняет |
| POST | `/api/deals/:id/schedule` | Планирование публикации |
| GET | `/api/escrow/deal/:dealId` | Данные для перевода TON |
| POST | `/api/escrow/deal/:dealId/confirm-funded` | Подтверждение внесения средств |

---

## Лицензия

MIT (готово к Open Source)
