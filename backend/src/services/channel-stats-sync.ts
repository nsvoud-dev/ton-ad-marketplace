/**
 * Синхронизация статистики канала из Telegram (GramJS).
 * Вызывается при добавлении канала и по требованию.
 */

import { prisma } from '../lib/prisma.js';
import { fetchChannelStats } from './gramjs-stats.js';

export async function syncChannelStats(channelId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { telegramId: true, username: true, subscribers: true, extendedStats: true },
  });
  const identifier: bigint | string | null = channel?.telegramId
    ? channel.telegramId
    : channel?.username
      ? (channel.username.startsWith('@') ? channel.username : `@${channel.username}`)
      : null;
  if (!identifier) return false;

  const stats = await fetchChannelStats(identifier, {
    currentSubscribers: channel?.subscribers ?? undefined,
  });
  if (!stats) return false;

  const update: Record<string, unknown> = {};
  if (stats.subscribers != null) update.subscribers = stats.subscribers;
  if (stats.views != null) update.views = stats.views;
  if (stats.reach != null) update.reach = stats.reach;
  if (stats.languageCharts?.length) update.languageCharts = stats.languageCharts;
  if (stats.premiumStats) update.premiumStats = stats.premiumStats;
  if (
    stats.notificationsEnabled != null ||
    stats.viewSources ||
    stats.sharesPerPost != null ||
    stats.genderDistribution
  ) {
    const existing = (channel?.extendedStats as Record<string, unknown>) ?? {};
    update.extendedStats = {
      ...existing,
      ...(stats.notificationsEnabled != null && { notificationsEnabled: stats.notificationsEnabled }),
      ...(stats.viewSources && Object.keys(stats.viewSources).length > 0 && { viewSources: stats.viewSources }),
      ...(stats.sharesPerPost != null && { sharesPerPost: stats.sharesPerPost }),
      ...(stats.genderDistribution && { genderDistribution: stats.genderDistribution }),
    };
  }

  if (Object.keys(update).length === 0) return true;

  await prisma.channel.update({
    where: { id: channelId },
    data: update,
  });
  return true;
}
