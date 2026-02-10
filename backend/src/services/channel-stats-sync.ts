/**
 * Синхронизация статистики канала из Telegram (GramJS).
 * Вызывается при добавлении канала и по требованию.
 */

import { prisma } from '../lib/prisma.js';
import { fetchChannelStats } from './gramjs-stats.js';

export async function syncChannelStats(channelId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { telegramId: true },
  });
  if (!channel) return false;

  const stats = await fetchChannelStats(channel.telegramId);
  if (!stats) return false;

  const update: Record<string, unknown> = {};
  if (stats.subscribers != null) update.subscribers = stats.subscribers;
  if (stats.views != null) update.views = stats.views;
  if (stats.languageCharts?.length) update.languageCharts = stats.languageCharts;
  if (stats.premiumStats) update.premiumStats = stats.premiumStats;

  if (Object.keys(update).length === 0) return true;

  await prisma.channel.update({
    where: { id: channelId },
    data: update,
  });
  return true;
}
