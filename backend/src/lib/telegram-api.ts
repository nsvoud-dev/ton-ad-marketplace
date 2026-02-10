/**
 * Telegram Bot API helpers: getChatMember, editMessage для проверки постов.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export type ChatMemberStatus = 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';

export interface ChatMember {
  status: ChatMemberStatus;
  user: { id: number; username?: string };
}

/**
 * Проверяет, является ли пользователь админом (creator или administrator) канала.
 * @param chatId - ID канала (например -1001234567890)
 * @param userId - Telegram user ID
 */
export async function getChatMember(chatId: string | number, userId: number): Promise<ChatMember | null> {
  if (!BOT_TOKEN) return null;
  try {
    const url = `${BASE}/getChatMember?chat_id=${encodeURIComponent(String(chatId))}&user_id=${userId}`;
    const res = await fetch(url);
    const data = (await res.json()) as { ok: boolean; result?: ChatMember };
    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch (e) {
    console.error('getChatMember failed:', e);
    return null;
  }
}

export function isAdmin(status: ChatMemberStatus): boolean {
  return status === 'creator' || status === 'administrator';
}

/**
 * Проверяет, что пользователь остаётся админом канала.
 */
export async function verifyUserIsChannelAdmin(chatId: string | number, telegramUserId: number): Promise<boolean> {
  const member = await getChatMember(chatId, telegramUserId);
  return member ? isAdmin(member.status) : false;
}

/**
 * Проверяет, существует ли сообщение в канале (бот должен был его отправить).
 * Использует editMessageReplyMarkup с пустой разметкой — работает для любого типа сообщения.
 * Если сообщение удалено — API вернёт ошибку.
 */
export async function editMessageExists(chatId: string | number, messageId: number): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const url = `${BASE}/editMessageReplyMarkup`;
    const body = new URLSearchParams({
      chat_id: String(chatId),
      message_id: String(messageId),
      reply_markup: JSON.stringify({ inline_keyboard: [] }),
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    return data.ok === true;
  } catch (e) {
    console.error('editMessageExists failed:', e);
    return false;
  }
}
