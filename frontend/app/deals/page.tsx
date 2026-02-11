'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '../components/ui/Skeleton';
import { useTranslation } from '../../lib/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DealsPage() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetch(`${API_URL}/api/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const formatTon = (nano: string) => (Number(BigInt(nano)) / 1e9).toFixed(2);

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-4 w-24 mb-4" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>{t('myDeals')}</h1>
      <Link href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>{t('back')}</Link>
      {deals.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>{t('noDeals')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {deals.map((d) => (
            <li key={String(d.id)} style={{ padding: 12, marginBottom: 8, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8 }}>
              <strong>Deal {String(d.id).slice(0, 8)}…</strong>
              <br />
              <span>{formatTon(String(d.amountNano))} TON</span> — <span style={{ color: 'var(--tg-theme-hint-color)' }}>{String(d.status)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
