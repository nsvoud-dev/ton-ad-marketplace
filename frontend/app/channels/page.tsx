'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '../components/ui/Skeleton';
import { formatPriceInTon } from '../../lib/ton-utils';
import { useTranslation } from '../../lib/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ChannelsPage() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetch(`${API_URL}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-4 w-24 mb-4" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>{t('myChannels')}</h1>
      <Link href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>{t('back')}</Link>
      <a
        href="/channels/add"
        style={{
          display: 'inline-block',
          marginBottom: 16,
          padding: '12px 20px',
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        {t('addChannel')}
      </a>
      {channels.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>{t('noChannels')}</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {channels.map((c) => (
            <li key={String(c.id)} style={{ marginBottom: 8 }}>
              <Link
                href={`/channels/${c.id}`}
                style={{
                  display: 'block',
                  padding: 12,
                  background: 'var(--tg-theme-secondary-bg-color)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <strong>{String(c.title || c.username || c.id)}</strong>
                <br />
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>{formatPriceInTon(String(c.pricePerPostNano ?? 0))} {t('tonPerPost')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
