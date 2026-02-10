/**
 * Фоновая задача: проверка рекламного поста через 24 часа.
 * 1) Наличие сообщения в канале
 * 2) Целостность — хеш контента совпадает с одобренным черновиком (пост не редактировался)
 */

import { prisma } from '../lib/prisma.js';
import { editMessageExists } from '../lib/telegram-api.js';
import { getChannelMessageContent } from '../services/gramjs-stats.js';
import { computeTextContentHash } from '../lib/draft-hash.js';
import { DealStatus } from '@prisma/client';

const VERIFICATION_HOURS = 24;
const INTERVAL_MS = 10 * 60 * 1000; // 10 минут

export function startPostVerificationWorker() {
  const run = async () => {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() - VERIFICATION_HOURS);

    const deals = await prisma.deal.findMany({
      where: {
        status: DealStatus.Published,
        publishedAt: { lte: deadline },
        verifiedAt: null,
        verificationFailed: false,
        publishedPostMessageId: { not: null },
      },
      include: { channel: true },
    });

    for (const deal of deals) {
      const chatId = deal.channel.telegramId.toString();
      const messageId = Number(deal.publishedPostMessageId);

      try {
        const exists = await editMessageExists(chatId, messageId);

        if (!exists) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: {
              status: DealStatus.Refunded,
              verificationFailed: true,
              verifiedAt: new Date(),
              verificationNotes: 'Post was deleted from channel within 24h',
            },
          });
          console.log(`[Worker] Deal ${deal.id} — post deleted, refund required`);
          continue;
        }

        if (deal.draftContentHash) {
          const postText = await getChannelMessageContent(deal.channel.telegramId, messageId);
          const currentHash = computeTextContentHash(postText ?? '');

          if (currentHash !== deal.draftContentHash) {
            await prisma.deal.update({
              where: { id: deal.id },
              data: {
                status: DealStatus.Refunded,
                verificationFailed: true,
                verifiedAt: new Date(),
                verificationNotes: 'Post was edited after publication — content hash mismatch',
              },
            });
            console.log(`[Worker] Deal ${deal.id} — post was edited, refund required`);
            continue;
          }
        }

        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            status: DealStatus.Completed,
            verifiedAt: new Date(),
            verificationNotes: 'Post verified after 24h (exists and content unchanged)',
          },
        });
        console.log(`[Worker] Deal ${deal.id} verified — post intact`);
      } catch (e) {
        console.error(`[Worker] Deal ${deal.id} verification error:`, e);
      }
    }
  };

  run();
  setInterval(run, INTERVAL_MS);
  console.log('[Worker] Post verification worker started (interval 10 min)');
}
