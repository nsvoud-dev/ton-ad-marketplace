/**
 * SHA-256 хеш контента черновика для проверки целостности поста.
 * Используется для сравнения с опубликованным постом (проверка редактирования).
 */

import { createHash } from 'crypto';

/**
 * Каноническое представление: текст + отсортированные URL медиа.
 */
export function computeDraftContentHash(draftText: string | null, draftMediaUrls: string[]): string {
  const text = (draftText ?? '').trim();
  const media = [...(draftMediaUrls ?? [])].sort().join('\n');
  const content = `${text}\n${media}`.trim();
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Хеш текста для сравнения с полученным из API (message.message или message.caption).
 */
export function computeTextContentHash(text: string | null): string {
  return createHash('sha256').update((text ?? '').trim(), 'utf8').digest('hex');
}
