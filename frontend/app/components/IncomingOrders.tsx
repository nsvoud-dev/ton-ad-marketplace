'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../../lib/useTranslation';
import { formatPriceInTon } from '../../lib/ton-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function IncomingOrders({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => list.filter((d: Record<string, unknown>) => d.channelId === channelId))
      .then(setDeals)
      .catch(() => setDeals([]));
  }, [channelId]);

  if (deals.length === 0) {
    return <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>{t('noIncomingOrders')}</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {deals.map((d) => (
        <li
          key={String(d.id)}
          style={{
            padding: 12,
            marginBottom: 8,
            background: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 8,
          }}
        >
          <Link
            href={`/deals`}
            style={{ color: 'var(--tg-theme-link-color)', textDecoration: 'none', fontWeight: 600 }}
          >
            Deal {String(d.id).slice(0, 8)}…
          </Link>
          <br />
          <span>{formatPriceInTon(String(d.amountNano ?? 0))} TON</span>
          {' — '}
          <span style={{ color: 'var(--tg-theme-hint-color)' }}>{String(d.status)}</span>
        </li>
      ))}
    </ul>
  );
}
