# Отчёт об аудите и рефакторинге проекта

**Дата:** 2025-02-11  
**Роль:** Senior Fullstack Engineer

---

## 1. Типизация данных (TypeScript)

- **Созданы** `frontend/lib/types.ts` — интерфейсы `User`, `Channel`, `OrderInfo`, `Campaign`, соответствующие Prisma и API.
- **Создан** `frontend/lib/api-utils.ts` — хелпер `getErrorMessage()` для извлечения сообщения из ответа API (строки, zod flatten, вложенные объекты).
- **Исправлен баг** в `backend/src/routes/campaigns.ts`: в `include` для `prisma.campaign.create` указан несуществующий `owner` — удалён (у Campaign нет relation owner).

---

## 2. TON / nanoTON

- **Проверено:** везде `pricePerPostNano` передаётся как строка (nano), хранение в BigInt. `formatPriceInTon()` используется для отображения.
- **BOC:** `externalId` принимает строку; frontend передаёт `txBoc` — сохранение BOC транзакции коррекно.
- **Исправлено:** `frontend/app/channels/page.tsx` — цена показывалась как `nano TON/post`, заменено на `formatPriceInTon(...) TON / пост`.

---

## 3. Environment Variables

- **providers.tsx:** убран захардкоженный `https://41bffa7f5a1cda.lhr.life/tonconnect-manifest.json`. Manifest URL берётся из `NEXT_PUBLIC_TON_CONNECT_MANIFEST_URL` или, при его отсутствии, из `window.location.origin + '/api/tonconnect-manifest'`.
- **Добавлен** `frontend/app/api/tonconnect-manifest/route.ts` — динамический manifest, где `url` и `iconUrl` строятся из `NEXT_PUBLIC_APP_URL` или заголовков запроса.
- **Добавлен** `.env.example` с описанием переменных и без значений по умолчанию.

---

## 4. Обработка ошибок

**Backend:**
- `campaigns POST` при 400 возвращает `{ error: { message: msg }, details }` — единый формат сообщения.
- Добавлен `preHandler: auth` для `campaigns PATCH /:id` (раньше отсутствовал).

**Frontend:**
- `getErrorMessage()` — единый разбор ответа API (строка, zod, вложенные объекты).
- `campaigns/page.tsx` — ошибки order-info и create-campaign показываются через `toast.error()`.
- `campaigns/page.tsx` — при ошибке order-info показывается toast, `setChannel(null)`.
- `CampaignsList` — при ошибке загрузки вызывается `toast.error()`.
- `channels/add` — при ошибке вызывается `toast.error()` и `getErrorMessage()`.

---

## 5. Жизненный цикл (Race conditions)

**WalletSync.tsx:**
- Добавлен `AbortController` для отмены fetch при размонтировании и повторном запуске эффекта.
- Проверка `prevAddressRef.current !== currentAddress` — игнорируются ответы от устаревших запросов.
- При `AbortError` исключение не обрабатывается как ошибка.

**Skeleton:**
- `channels/[id]` — skeleton показывается при `loading === true`, скрывается после `setLoading(false)`.
- `campaigns` — skeleton показывается при `loading === true`, скрывается после загрузки order-info.

---

## 6. Telegram Integration

- `sendMessage` в `campaigns` и `channels` (notify-interest) обёрнут в try-catch; при неудаче логируется `console.error`, HTTP-ответ не падает.
- `chatId` передаётся как `owner.telegramId.toString()` — формат корректен.
- Сценарий с заблокированным ботом обрабатывается: API вернёт ошибку (например, 403), она логируется, кампания/notify-interest продолжают выполняться.

---

## Файлы изменены

| Файл | Изменения |
|------|-----------|
| `frontend/lib/api-utils.ts` | Новый файл |
| `frontend/lib/types.ts` | Новый файл |
| `frontend/app/api/tonconnect-manifest/route.ts` | Новый файл |
| `frontend/app/providers.tsx` | Убран hardcode manifest URL |
| `frontend/app/components/WalletSync.tsx` | AbortController, проверка устаревших ответов |
| `frontend/app/campaigns/page.tsx` | getErrorMessage, toast.error, обработка order-info |
| `frontend/app/channels/page.tsx` | formatPriceInTon для цен |
| `frontend/app/channels/add/page.tsx` | getErrorMessage, toast |
| `backend/src/routes/campaigns.ts` | auth для PATCH, формат ошибок 400, убран owner из include |
| `.env.example` | Новый файл |
