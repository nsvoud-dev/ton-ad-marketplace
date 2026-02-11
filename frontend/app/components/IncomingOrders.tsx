'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../../lib/useTranslation';
import { formatPriceInTon } from '../../lib/ton-utils';
import { Skeleton } from './ui/Skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#fef3c7', text: '#92400e' },
  Funded: { bg: '#dbeafe', text: '#1e40af' },
  Draft_Review: { bg: '#e0e7ff', text: '#3730a3' },
  Scheduled: { bg: '#e0f2fe', text: '#0369a1' },
  Published: { bg: '#d1fae5', text: '#065f46' },
  Completed: { bg: '#d1fae5', text: '#065f46' },
  Refunded: { bg: '#fee2e2', text: '#991b1b' },
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function getAdPreview(deal: Record<string, unknown>): string {
  const campaign = deal.campaign as Record<string, unknown> | undefined;
  const draftText = deal.draftText as string | undefined;
  const briefTitle = campaign?.briefTitle as string | undefined;
  const briefDescription = campaign?.briefDescription as string | undefined;
  const text = draftText || briefTitle || briefDescription || '';
  const trimmed = String(text).trim();
  return trimmed ? (trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed) : '—';
}

export function IncomingOrders({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/api/deals?channelId=${channelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [channelId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '32px 16px',
          background: 'var(--tg-theme-bg-color)',
          borderRadius: 12,
          border: '1px dashed var(--tg-theme-hint-color)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} aria-hidden>
          📋
        </div>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, lineHeight: 1.5 }}>
          {t('emptyOrdersHint')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {deals.map((d) => {
        const status = String(d.status ?? 'Pending');
        const colors = STATUS_COLORS[status] ?? { bg: '#f4f4f5', text: '#71717a' };
        return (
          <Link
            key={String(d.id)}
            href="/deals"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <div
              style={{
                padding: 16,
                background: 'var(--tg-theme-secondary-bg-color)',
                borderRadius: 12,
                border: '1px solid transparent',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--tg-theme-link-color)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(36, 129, 204, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                  {formatDate(String(d.createdAt ?? ''))}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: colors.bg,
                    color: colors.text,
                  }}
                >
                  {status.replace('_', ' ')}
                </span>
              </div>
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: 'var(--tg-theme-text-color)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 40,
                }}
              >
                {getAdPreview(d)}
              </p>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-theme-button-color)' }}>
                {formatPriceInTon(String(d.amountNano ?? 0))} TON
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
