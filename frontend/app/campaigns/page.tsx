'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetch(`${API_URL}/api/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>Мои кампании</h1>
      <a href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>← Назад</a>
      {campaigns.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>Нет кампаний</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {campaigns.map((c) => (
            <li key={String(c.id)} style={{ padding: 12, marginBottom: 8, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8 }}>
              <strong>{String((c as { briefTitle?: string }).briefTitle || c.id)}</strong>
              <br />
              <span style={{ color: 'var(--tg-theme-hint-color)' }}>Status: {String(c.status)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
