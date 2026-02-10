'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);

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
      .catch(() => setChannels([]));
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>Мои каналы</h1>
      <a href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>← Назад</a>
      {channels.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>Нет каналов</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {channels.map((c) => (
            <li key={String(c.id)} style={{ padding: 12, marginBottom: 8, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8 }}>
              <strong>{String(c.title || c.username || c.id)}</strong>
              <br />
              <span style={{ color: 'var(--tg-theme-hint-color)' }}>{String(c.pricePerPostNano)} nano TON/post</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
