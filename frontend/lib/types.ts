/**
 * Типы, соответствующие Prisma и ответам API.
 */

export type UserRole = 'Owner' | 'Advertiser' | 'Publisher';
export type CampaignStatus = 'Draft' | 'Submitted' | 'Accepted' | 'Rejected' | 'InProgress' | 'Completed';

export interface User {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  walletAddress: string | null;
  balanceNano: string;
}

export interface Channel {
  id: string;
  telegramId: string | null;
  username: string | null;
  title: string | null;
  description: string | null;
  subscribers: number;
  views: number;
  reach: number;
  language: string | null;
  languageCharts: unknown;
  premiumStats: unknown;
  extendedStats: unknown;
  pricePerPostNano: string; // nano — всегда строка с API
  isVerified: boolean;
  ownerWallet?: string | null; // добавляется в order-info
}

export interface OrderInfo {
  id: string;
  title: string | null;
  username: string | null;
  pricePerPostNano: string;
  ownerWallet: string | null;
}

export interface Campaign {
  id: string;
  channelId: string;
  status: CampaignStatus;
  briefTitle: string | null;
  briefDescription: string | null;
  briefBudgetNano: string | null;
  externalId: string | null;
  channel?: Channel;
}
