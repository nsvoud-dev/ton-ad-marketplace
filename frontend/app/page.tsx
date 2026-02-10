'use client';

import { useEffect, useState } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram?.WebApp) {
      const tg = (window as unknown as { Telegram: { WebApp: { initData: string; ready: () => void } } }).Telegram;
      setInitData(tg.WebApp.initData);
      tg.WebApp.ready();
    }
  }, []);

  const login = async () => {
    if (!initData) {
      alert('Откройте приложение через Telegram');
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
      } else {
        alert(data.error?.message || 'Auth failed');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

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

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 16 }}>Ton Ad Marketplace</h1>
      <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
        MVP маркетплейса рекламы для Telegram каналов
      </p>

      {!user ? (
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
          Войти через Telegram
        </button>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>{String(user.firstName || user.username || user.id)}</strong>
            <br />
            <span style={{ color: 'var(--tg-theme-hint-color)' }}>Role: {String(user.role)}</span>
          </div>
          <TonConnectButton />
          <div style={{ marginTop: 24 }}>
            <a href="/channels" style={{ display: 'block', marginBottom: 8, color: 'var(--tg-theme-link-color)' }}>Мои каналы</a>
            <a href="/campaigns" style={{ display: 'block', marginBottom: 8, color: 'var(--tg-theme-link-color)' }}>Мои кампании</a>
            <a href="/deals" style={{ display: 'block', marginBottom: 8, color: 'var(--tg-theme-link-color)' }}>Мои сделки</a>
          </div>
          <button
            onClick={logout}
            style={{
              marginTop: 24,
              padding: '8px 16px',
              background: 'var(--tg-theme-secondary-bg-color)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        </>
      )}
    </main>
  );
}
