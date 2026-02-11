/**
 * i18n: defaultLocale is 'en'.
 */

export type Locale = 'ru' | 'en';

export const defaultLocale: Locale = 'en';

export const translations = {
  // Home / Auth
  appTitle: { ru: 'Ton Ad Marketplace', en: 'Ton Ad Marketplace' },
  appSubtitle: { ru: 'MVP маркетплейса рекламы для Telegram каналов', en: 'Telegram Ad Marketplace MVP' },
  authInProgress: { ru: 'Авторизация…', en: 'Signing in…' },
  loginWithTelegram: { ru: 'Войти через Telegram', en: 'Sign in with Telegram' },
  welcomeToast: { ru: 'Добро пожаловать в Ton Ad Marketplace!', en: 'Welcome to Ton Ad Marketplace!' },
  loginErrorToast: { ru: 'Не удалось войти в систему. Попробуйте снова', en: 'Could not sign in. Please try again' },
  openViaTelegram: { ru: 'Откройте приложение через Telegram', en: 'Open the app via Telegram' },
  role: { ru: 'Роль:', en: 'Role:' },
  roleAdvertiser: { ru: 'Advertiser', en: 'Advertiser' },
  roleCreator: { ru: 'Creator', en: 'Creator' },
  roleChangedToast: { ru: 'Роль изменена на', en: 'Role changed to' },
  roleChangeErrorToast: { ru: 'Не удалось сменить роль', en: 'Could not change role' },
  myChannels: { ru: 'Мои каналы', en: 'My Channels' },
  myCampaigns: { ru: 'Мои кампании', en: 'My Campaigns' },
  myDeals: { ru: 'Мои сделки', en: 'My Deals' },
  logout: { ru: 'Выйти', en: 'Logout' },

  // Navigation
  back: { ru: '← Назад', en: '← Back' },
  backToChannels: { ru: '← Назад к каналам', en: '← Back to channels' },
  backToChannel: { ru: '← Назад к каналу', en: '← Back to channel' },

  // Channels
  addChannel: { ru: 'Добавить канал', en: 'Add Channel' },
  noChannels: { ru: 'Нет каналов', en: 'No channels' },
  channelIdLabel: { ru: 'ID канала (telegramId)', en: 'Channel ID (telegramId)' },
  channelIdPlaceholder: { ru: '-1001234567890', en: '-1001234567890' },
  channelNameLabel: { ru: 'Название', en: 'Name' },
  channelNamePlaceholder: { ru: 'Мой канал', en: 'My channel' },
  pricePerPostLabel: { ru: 'Цена за пост (nanotons)', en: 'Price per post (nanotons)' },
  pricePlaceholder: { ru: '1000000000', en: '1000000000' },
  addBtn: { ru: 'Добавить', en: 'Add' },
  addingBtn: { ru: 'Добавление…', en: 'Adding…' },
  channelAddedToast: { ru: 'Канал добавлен', en: 'Channel added' },
  channelAddError: { ru: 'Ошибка при добавлении канала', en: 'Error adding channel' },
  genericError: { ru: 'Ошибка', en: 'Error' },
  subscribers: { ru: 'Подписчиков', en: 'Subscribers' },
  tonPerPost: { ru: 'TON / пост', en: 'TON / post' },
  syncStats: { ru: 'Обновить статистику', en: 'Update statistics' },
  syncingStats: { ru: 'Обновление…', en: 'Updating…' },
  channelNotFound: { ru: 'Канал не найден', en: 'Channel not found' },

  // Channel stats sections
  audienceLanguages: { ru: 'Языки аудитории', en: 'Audience languages' },
  notifications: { ru: 'Уведомления', en: 'Notifications' },
  notificationsSubtext: { ru: 'подписчиков с включёнными уведомлениями', en: 'subscribers with notifications enabled' },
  viewSources: { ru: 'Источники просмотров', en: 'View sources' },
  virality: { ru: 'Виральность', en: 'Virality' },
  sharesPerPostSubtext: { ru: 'среднее число репостов на пост', en: 'avg shares per post' },
  premiumSubtext: { ru: 'подписчиков с Premium', en: 'subscribers with Premium' },
  demographics: { ru: 'Демография', en: 'Demographics' },
  male: { ru: '♂ Мужчины', en: '♂ Male' },
  female: { ru: '♀ Женщины', en: '♀ Female' },
  engagement: { ru: 'Вовлеченность (ERR)', en: 'Engagement (ERR)' },
  viewsPerSubscribers: { ru: 'просмотры / подписчики', en: 'views / subscribers' },
  placeAd: { ru: 'Разместить рекламу · Купить за', en: 'Place ad · Buy for' },

  // Campaigns
  noCampaigns: { ru: 'Нет кампаний', en: 'No campaigns' },
  postTextLabel: { ru: 'Текст поста', en: 'Post text' },
  postTextPlaceholder: { ru: 'Введите текст рекламного поста…', en: 'Enter ad post text…' },
  mediaUrlLabel: { ru: 'Ссылка на медиа', en: 'Media link' },
  mediaUrlPlaceholder: { ru: 'https://…', en: 'https://…' },
  totalToPay: { ru: 'Итого к оплате', en: 'Total to pay' },
  connectWallet: { ru: 'Подключите кошелёк', en: 'Connect wallet' },
  payWithWallet: { ru: 'Оплатить через кошелёк', en: 'Pay with wallet' },
  creating: { ru: 'Создание…', en: 'Creating…' },
  ownerNoWallet: { ru: 'Владелец еще не настроил приём платежей. Мы уведомили его об интересе к рекламе.', en: "Owner hasn't set up payment yet. We've notified them of your interest." },
  orderSuccess: { ru: 'Заказ успешно создан! Владелец канала уведомлен', en: 'Order created! Channel owner notified' },
  redirecting: { ru: 'Перенаправление на список кампаний…', en: 'Redirecting to campaigns…' },
  txSentToast: { ru: 'Транзакция отправлена!', en: 'Transaction sent!' },
  txDeclinedToast: { ru: 'Вы отменили транзакцию', en: 'Transaction cancelled' },
  txError: { ru: 'Ошибка оплаты', en: 'Payment error' },
  createCampaignError: { ru: 'Ошибка создания кампании', en: 'Error creating campaign' },
  noOwnerWallet: { ru: 'У владельца канала не указан кошелёк для приёма платежей', en: "Channel owner hasn't set a payment wallet" },
  loadChannelError: { ru: 'Не удалось загрузить данные канала', en: "Couldn't load channel data" },
  loadError: { ru: 'Ошибка загрузки', en: 'Load error' },
  loadCampaignsError: { ru: 'Не удалось загрузить кампании', en: "Couldn't load campaigns" },
  txNoBoc: { ru: 'Транзакция не вернула BOC', en: 'Transaction did not return BOC' },

  // Deals
  noDeals: { ru: 'Нет сделок', en: 'No deals' },

  // Wallet
  walletSyncedToast: { ru: 'Кошелек привязан к профилю', en: 'Wallet linked to profile' },

  // Loading
  loading: { ru: 'Загрузка…', en: 'Loading…' },
  loadingAria: { ru: 'Загрузка', en: 'Loading' },
} as const;

export type TranslationKey = keyof typeof translations;

export function getLocale(): Locale {
  return defaultLocale;
}

export function t(key: TranslationKey, locale?: Locale): string {
  const loc = locale ?? defaultLocale;
  return translations[key][loc];
}
