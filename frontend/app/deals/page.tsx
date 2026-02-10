'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DealsPage() {
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([]);

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
      .catch(() => setDeals([]));
  }, []);

  const formatTon = (nano: string) => (Number(BigInt(nano)) / 1e9).toFixed(2);

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>Мои сделки</h1>
      <a href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>← Назад</a>
      {deals.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>Нет сделок</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
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
