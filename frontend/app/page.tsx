'use client';

import { useEffect, useState, useCallback } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toast } from 'sonner';
import { Tv, Megaphone, HandCoins, ChevronRight } from 'lucide-react';
import { useTranslation } from '../lib/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ROLE_OPTIONS = [
  { value: 'Advertiser' as const, labelKey: 'roleAdvertiser' as const },
  { value: 'Publisher' as const, labelKey: 'roleCreator' as const },
];

export default function Home() {
  const { t } = useTranslation();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram?.WebApp) {
      const tg = (window as unknown as { Telegram: { WebApp: { initData: string; ready: () => void } } }).Telegram;
      setInitData(tg.WebApp.initData);
      tg.WebApp.ready();
    }
  }, []);

  const login = useCallback(async () => {
    if (!initData) {
      toast.error(t('openViaTelegram'));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        toast.success(t('welcomeToast'));
      } else {
        toast.error(t('loginErrorToast'));
      }
    } catch {
      toast.error(t('loginErrorToast'));
    }
  }, [initData, t]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Проверка токена при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => u && setUser(u))
        .catch(() => logout());
    }
  }, [user]);

  // Автовход в Mini App: если initData есть — логинимся сразу, кнопка не показывается
  useEffect(() => {
    if (initData && initData.length > 0 && !user && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem('token', data.token);
            setUser(data.user);
            toast.success(t('welcomeToast'));
          }
        } catch {
          // Сеть недоступна — оставляем показывать состояние загрузки
        }
      })();
    }
  }, [initData, user, autoLoginAttempted, t]);

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 16 }}>{t('appTitle')}</h1>
      <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
        {t('appSubtitle')}
      </p>

      {!user ? (
        initData && initData.length > 0 ? (
          <p style={{ color: 'var(--tg-theme-hint-color)' }}>{t('authInProgress')}</p>
        ) : (
          <button
            onClick={login}
            style={{
              padding: '12px 24px',
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {t('loginWithTelegram')}
          </button>
        )
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>{String(user.firstName || user.username || user.id)}</strong>
            <br />
            <div className="mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('role')}</span>
              <div className="flex gap-1 mt-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 inline-flex">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token || user.role === opt.value) return;
                      const res = await fetch(`${API_URL}/api/auth/me`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ role: opt.value }),
                      });
                      if (res.ok) {
                        const u = await res.json();
                        setUser(u);
                        toast.success(`${t('roleChangedToast')} ${t(opt.labelKey)}`);
                      } else {
                        toast.error(t('roleChangeErrorToast'));
                      }
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      user.role === opt.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <TonConnectButton />
          <div className="mt-6 flex flex-col gap-2" style={{ gap: 8 }}>
            <a
              href="/channels"
              style={{
                display: 'flex',
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                textDecoration: 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                border: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tv size={20} strokeWidth={2} />
                {t('myChannels')}
              </span>
              <ChevronRight size={18} opacity={0.6} />
            </a>
            <a
              href="/campaigns"
              style={{
                display: 'flex',
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                textDecoration: 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                border: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Megaphone size={20} strokeWidth={2} />
                {t('myCampaigns')}
              </span>
              <ChevronRight size={18} opacity={0.6} />
            </a>
            <a
              href="/deals"
              style={{
                display: 'flex',
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                textDecoration: 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                border: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HandCoins size={20} strokeWidth={2} />
                {t('myDeals')}
              </span>
              <ChevronRight size={18} opacity={0.6} />
            </a>
          </div>
          <button
            onClick={logout}
            style={{
              marginTop: 24,
              padding: '10px 18px',
              background: 'var(--tg-theme-secondary-bg-color)',
              color: 'var(--tg-theme-hint-color)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t('logout')}
          </button>
        </>
      )}
    </main>
  );
}
