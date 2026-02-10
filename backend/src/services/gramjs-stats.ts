/**
 * GramJS (MTProto) — сбор расширенной статистики канала.
 * Требует API_ID, API_HASH и сессию пользователя-админа канала.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TelegramClient } = require('telegram');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StringSession } = require('telegram/sessions');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Api } = require('telegram');

const apiId = parseInt(process.env.TELEGRAM_API_ID ?? '0', 10);
const apiHash = process.env.TELEGRAM_API_HASH ?? '';
const sessionString = process.env.TELEGRAM_MTProto_SESSION ?? '';

let client: InstanceType<typeof TelegramClient> | null = null;

export interface LanguageChartItem {
  lang: string;
  percentage: number;
}

export interface ChannelStatsResult {
  subscribers?: number;
  views?: number;
  languageCharts?: LanguageChartItem[];
  premiumStats?: {
    premiumSubscribers?: number;
    premiumPercentage?: number;
    [key: string]: unknown;
  };
}

/**
 * Инициализирует GramJS-клиент. Вызывать при старте или перед первым запросом.
 */
export async function initGramJsClient(): Promise<InstanceType<typeof TelegramClient> | null> {
  if (!apiId || !apiHash || !sessionString) {
    console.warn('[GramJS] TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_MTProto_SESSION required');
    return null;
  }
  if (client) return client;

  const session = new StringSession(sessionString);
  client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    useWSS: false,
  });
  await client.connect();
  if (!(await client.checkAuthorization())) {
    console.error('[GramJS] Session invalid, re-login required');
    client = null;
    return null;
  }
  return client;
}

/**
 * Получает InputChannel по telegramId (например -1001234567890).
 */
async function getInputChannel(tgClient: InstanceType<typeof TelegramClient>, channelTelegramId: bigint) {
  const fullId = channelTelegramId.toString();
  const numId = fullId.startsWith('-100') ? fullId.slice(4) : fullId;
  const entity = await tgClient.getEntity(Number(numId));
  if (!entity) throw new Error('Channel not found');
  return entity;
}

/**
 * Парсит StatsGraph в массив языков (если доступно).
 */
function parseLanguagesGraph(graph: unknown): LanguageChartItem[] {
  const result: LanguageChartItem[] = [];
  if (!graph || typeof graph !== 'object') return result;

  const g = graph as { json?: { data?: unknown }; zoomToken?: string };
  if (g.json && typeof g.json === 'object') {
    const data = (g.json as { data?: unknown }).data;
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
          result.push({
            lang: String((item as { name: string }).name),
            percentage: Number((item as { value: number }).value) || 0,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Собирает расширенную статистику канала через stats.getBroadcastStats.
 */
export async function fetchChannelStats(channelTelegramId: bigint): Promise<ChannelStatsResult | null> {
  const tgClient = await initGramJsClient();
  if (!tgClient) return null;

  try {
    const channel = await getInputChannel(tgClient, channelTelegramId);
    const stats = await tgClient.invoke(
      new Api.stats.GetBroadcastStats({
        channel,
        dark: false,
      })
    );

    const broadcastStats = stats as {
      followers?: { current?: number; [key: string]: unknown };
      viewsPerPost?: { current?: number; [key: string]: unknown };
      languagesGraph?: unknown;
      [key: string]: unknown;
    };

    const result: ChannelStatsResult = {};

    if (broadcastStats.followers && typeof broadcastStats.followers === 'object') {
      result.subscribers = Number((broadcastStats.followers as { current?: number }).current) || undefined;
    }
    if (broadcastStats.viewsPerPost && typeof broadcastStats.viewsPerPost === 'object') {
      result.views = Number((broadcastStats.viewsPerPost as { current?: number }).current) || undefined;
    }

    if (broadcastStats.languagesGraph) {
      const languages = parseLanguagesGraph(broadcastStats.languagesGraph);
      if (languages.length > 0) result.languageCharts = languages;
    }

    // Premium — если есть в ответе (поля могут отличаться по версии API)
    if ('premiumSubscribers' in broadcastStats && broadcastStats.premiumSubscribers) {
      const p = broadcastStats.premiumSubscribers as { current?: number };
      result.premiumStats = {
        premiumSubscribers: Number(p?.current) || 0,
        premiumPercentage:
          result.subscribers && p?.current
            ? Math.round((Number(p.current) / result.subscribers) * 1000) / 10
            : undefined,
      };
    }

    return result;
  } catch (e) {
    console.error('[GramJS] fetchChannelStats failed:', e);
    return null;
  }
}

/**
 * Получает текст сообщения из канала (для проверки целостности поста).
 */
export async function getChannelMessageContent(
  channelTelegramId: bigint,
  messageId: number
): Promise<string | null> {
  const tgClient = await initGramJsClient();
  if (!tgClient) return null;

  try {
    const channel = await getInputChannel(tgClient, channelTelegramId);
    const messages = await tgClient.getMessages(channel, { ids: [messageId] });
    if (!messages?.length) return null;

    const msg = messages[0] as { message?: string; text?: string };
    return msg?.message ?? msg?.text ?? null;
  } catch (e) {
    console.error('[GramJS] getChannelMessageContent failed:', e);
    return null;
  }
}
