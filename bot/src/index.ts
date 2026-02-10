/**
 * Telegram Bot — messaging, admin checks, auto-posting.
 * Все коммуникации идут через бота, не через Mini App.
 */

import { Telegraf, Context } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Telegraf(token);
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

bot.start((ctx) => {
  return ctx.reply(
    '👋 Добро пожаловать в Ton Ad Marketplace!\n\n' +
      '• Создавайте заявки на рекламу в Mini App\n' +
      '• Владельцы каналов получают уведомления здесь\n' +
      '• Весь процесс согласования — в чате с ботом\n\n' +
      'Откройте Mini App для начала работы.'
  );
});

bot.command('help', (ctx) => {
  return ctx.reply(
    'Команды:\n' +
      '/start — приветствие\n' +
      '/help — справка\n' +
      '/channels — мои каналы (владелец)\n' +
      '/campaigns — мои кампании (рекламодатель)\n' +
      '/deals — мои сделки'
  );
});

bot.command('channels', async (ctx) => {
  const res = await fetchUserData(ctx, '/api/channels');
  if (!res) return;
  const data = (await res.json()) as Array<{ id: string; username?: string; title?: string; pricePerPostNano: string }>;
  if (data.length === 0) {
    return ctx.reply('У вас пока нет каналов. Добавьте канал в Mini App.');
  }
  const text = data
    .map(
      (c) =>
        `• ${c.title ?? c.username ?? c.id}\n  Цена: ${formatTon(c.pricePerPostNano)} TON/post`
    )
    .join('\n\n');
  return ctx.reply(`Ваши каналы:\n\n${text}`);
});

bot.command('campaigns', async (ctx) => {
  const res = await fetchUserData(ctx, '/api/campaigns');
  if (!res) return;
  const data = (await res.json()) as Array<{ id: string; status: string; briefTitle?: string; channel?: { title?: string } }>;
  if (data.length === 0) {
    return ctx.reply('У вас пока нет кампаний. Создайте заявку в Mini App.');
  }
  const text = data
    .map((c) => `• ${c.briefTitle ?? c.id}\n  Канал: ${c.channel?.title ?? '—'}\n  Статус: ${c.status}`)
    .join('\n\n');
  return ctx.reply(`Ваши кампании:\n\n${text}`);
});

bot.command('deals', async (ctx) => {
  const res = await fetchUserData(ctx, '/api/deals');
  if (!res) return;
  const data = (await res.json()) as Array<{ id: string; status: string; amountNano: string }>;
  if (data.length === 0) {
    return ctx.reply('У вас пока нет сделок.');
  }
  const text = data
    .map((d) => `• Deal ${d.id.slice(0, 8)}… — ${formatTon(d.amountNano)} TON — ${d.status}`)
    .join('\n');
  return ctx.reply(`Ваши сделки:\n\n${text}`);
});

async function fetchUserData(ctx: Context, path: string): Promise<Response | null> {
  // Бот не хранит JWT — для MVP нужна связка telegramId -> api token.
  // Варианты: 1) Бот вызывает API с telegramId, API ищет user по telegramId
  // 2) Пользователь привязывает бота в Mini App, получает одноразовый code, вводит в боте
  // 3) Bot API передаёт initData при /start через menu button
  // MVP: бот даёт ссылку на Mini App, данные только там
  await ctx.reply('Откройте Mini App для просмотра данных. Команды бота скоро будут поддерживать авторизацию.');
  return null;
}

function formatTon(nano: string): string {
  const n = BigInt(nano);
  return (Number(n) / 1e9).toFixed(2);
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
