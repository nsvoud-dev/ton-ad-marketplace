import { prisma } from './prisma.js';
import { ChannelAdminRole } from '@prisma/client';

/**
 * Проверяет, может ли пользователь управлять каналом (owner или PR_Manager).
 */
export async function canUserManageChannel(userId: string, channelId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { ownerId: true },
  });
  if (!channel) return false;
  if (channel.ownerId === userId) return true;

  const admin = await prisma.channelAdmin.findUnique({
    where: {
      channelId_userId: { channelId, userId },
    },
  });
  return admin !== null && (admin.role === ChannelAdminRole.Owner || admin.role === ChannelAdminRole.PR_Manager);
}
