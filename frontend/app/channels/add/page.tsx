'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/api-utils';
import { useTranslation } from '../../../lib/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AddChannelPage() {
  const { t } = useTranslation();
  const [telegramId, setTelegramId] = useState('');
  const [title, setTitle] = useState('');
  const [pricePerPostNano, setPricePerPostNano] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          telegramId: telegramId.trim() || null,
          title: title.trim() || undefined,
          pricePerPostNano: pricePerPostNano.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage(data, t('channelAddError')));
      }
      toast.success(t('channelAddedToast'));
      window.location.href = '/channels';
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('genericError');
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>{t('addChannel')}</h1>
      <a href="/channels" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>
        {t('back')}
      </a>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('channelIdLabel')}
          <input
            type="text"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder={t('channelIdPlaceholder')}
            style={{
              display: 'block',
              width: '100%',
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              color: 'var(--tg-theme-text-color)',
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
        </label>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('channelNameLabel')}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('channelNamePlaceholder')}
            style={{
              display: 'block',
              width: '100%',
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              color: 'var(--tg-theme-text-color)',
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
        </label>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('pricePerPostLabel')}
          <input
            type="text"
            value={pricePerPostNano}
            onChange={(e) => setPricePerPostNano(e.target.value)}
            placeholder={t('pricePlaceholder')}
            style={{
              display: 'block',
              width: '100%',
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              color: 'var(--tg-theme-text-color)',
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
        </label>
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            background: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? t('addingBtn') : t('addBtn')}
        </button>
      </form>
    </main>
  );
}
