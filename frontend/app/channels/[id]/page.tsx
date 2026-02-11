'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatPriceInTon } from '../../../lib/ton-utils';
import { useTranslation } from '../../../lib/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ChannelPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchChannel = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    return fetch(`${API_URL}/api/channels/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Channel not found');
        return r.json();
      })
      .then(setChannel)
      .catch(() => setChannel(null));
  }, [params.id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetchChannel()?.finally(() => setLoading(false));
  }, [fetchChannel]);

  const handleSyncStats = async () => {
    const token = localStorage.getItem('token');
    if (!token || syncLoading) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/channels/${params.id}/sync-stats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchChannel();
      }
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-10 w-40 mb-8" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 24,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                padding: 20,
                borderRadius: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
              }}
            >
              <Skeleton className="mb-4 h-4 w-20" />
              <Skeleton className="mb-3 h-8 w-16" />
              <Skeleton className="mb-2 h-2 w-full" />
              <Skeleton className="mb-1 h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </main>
    );
  }
  if (!channel) return <main style={{ padding: 16 }}>{t('channelNotFound')}</main>;

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <Link href="/channels" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>
        {t('backToChannels')}
      </Link>
      <h1>{String(channel.title || channel.username || channel.id)}</h1>
      <div style={{ color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
        <p>{formatPriceInTon(String(channel.pricePerPostNano ?? 0))} {t('tonPerPost')}</p>
        {channel.subscribers != null && <p>{t('subscribers')}: {String(channel.subscribers)}</p>}
        {channel.description != null && channel.description !== '' && <p>{String(channel.description)}</p>}
      </div>
      <button
        onClick={handleSyncStats}
        disabled={syncLoading}
        style={{
          marginTop: 16,
          padding: '12px 20px',
          background: syncLoading ? 'var(--tg-theme-secondary-bg-color)' : 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          border: 'none',
          borderRadius: 8,
          cursor: syncLoading ? 'wait' : 'pointer',
          opacity: syncLoading ? 0.8 : 1,
        }}
      >
        {syncLoading ? (
          <>
            <span className="channel-sync-spinner" aria-hidden />
            {t('syncingStats')}
          </>
        ) : (
          t('syncStats')
        )}
      </button>
      {channel.languageCharts != null && (() => {
        const items = Array.isArray(channel.languageCharts)
          ? (channel.languageCharts as { lang?: string; name?: string; percentage?: number; value?: number }[]).map((x) => ({
              lang: String(x.lang ?? x.name ?? ''),
              percentage: Number(x.percentage ?? x.value ?? 0),
            }))
          : typeof channel.languageCharts === 'object' && channel.languageCharts !== null
            ? Object.entries(channel.languageCharts as Record<string, unknown>).map(([lang, pct]) => ({
                lang,
                percentage: Number(pct) || 0,
              }))
            : [];
        if (items.length === 0) return null;
        return (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('audienceLanguages')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div key={item.lang}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                    <span>{item.lang}</span>
                    <span style={{ color: 'var(--tg-theme-hint-color)' }}>{item.percentage}%</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--tg-theme-secondary-bg-color)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                        background: 'var(--tg-theme-button-color)',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
      {(() => {
        const es = channel.extendedStats as Record<string, unknown> | undefined;
        const notif = es?.notificationsEnabled != null ? Number(es.notificationsEnabled) : null;
        if (notif == null) return null;
        return (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('notifications')}</h3>
            <div
              style={{
                padding: 20,
                borderRadius: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  marginBottom: 12,
                  color: '#eab308',
                }}
              >
                {notif}%
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: 'var(--tg-theme-bg-color)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, notif))}%`,
                    background: '#eab308',
                    borderRadius: 5,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
                {t('notificationsSubtext')}
              </div>
            </div>
          </section>
        );
      })()}
      {(() => {
        const es = channel.extendedStats as Record<string, unknown> | undefined;
        const vs = es?.viewSources as Record<string, number> | undefined;
        if (!vs || typeof vs !== 'object' || Object.keys(vs).length === 0) return null;
        const items = Object.entries(vs)
          .map(([name, pct]) => ({ name, percentage: Number(pct) || 0 }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 8);
        return (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('viewSources')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                    <span>{item.name}</span>
                    <span style={{ color: 'var(--tg-theme-hint-color)' }}>{item.percentage}%</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--tg-theme-secondary-bg-color)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                        background: 'var(--tg-theme-button-color)',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
      {(() => {
        const es = channel.extendedStats as Record<string, unknown> | undefined;
        const shares = es?.sharesPerPost != null ? Number(es.sharesPerPost) : null;
        if (shares == null) return null;
        return (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('virality')}</h3>
            <div
              style={{
                padding: 20,
                borderRadius: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: 'var(--tg-theme-text-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--tg-theme-button-color)' }} aria-hidden>
                  ↗
                </span>
                {Number(shares.toFixed(1))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
                {t('sharesPerPostSubtext')}
              </div>
            </div>
          </section>
        );
      })()}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {channel.premiumStats != null && (() => {
          const ps = channel.premiumStats as Record<string, unknown>;
          const pct = Number(ps?.premiumPercentage ?? ps?.value ?? 0);
          if (pct <= 0 && !ps?.premiumSubscribers) return null;
          return (
            <section style={{ flex: '1 1 200px', minWidth: 200 }}>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Premium</h3>
              <div
                style={{
                  padding: 20,
                  borderRadius: 8,
                  background: 'var(--tg-theme-secondary-bg-color)',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--tg-theme-text-color)' }}>
                  {pct}%
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 5,
                    background: 'var(--tg-theme-bg-color)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, pct))}%`,
                      background: 'var(--tg-theme-button-color)',
                      borderRadius: 5,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
                  {t('premiumSubtext')}
                </div>
              </div>
            </section>
          );
        })()}
        {(() => {
          const es = channel.extendedStats as Record<string, unknown> | undefined;
          const gd = es?.genderDistribution as { male?: number; female?: number } | undefined;
          if (!gd || (gd.male == null && gd.female == null)) return null;
          const male = Number(gd.male) || 0;
          const female = Number(gd.female) || 0;
          if (male === 0 && female === 0) return null;
          const total = male + female;
          const malePct = total > 0 ? (male / total) * 100 : 0;
          const femalePct = total > 0 ? (female / total) * 100 : 0;
          return (
            <section style={{ flex: '1 1 200px', minWidth: 200 }}>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('demographics')}</h3>
              <div
                style={{
                  padding: 20,
                  borderRadius: 8,
                  background: 'var(--tg-theme-secondary-bg-color)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                      <span>{t('male')}</span>
                      <span style={{ color: 'var(--tg-theme-hint-color)' }}>{Math.round(malePct)}%</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--tg-theme-bg-color)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, malePct)}%`,
                          background: '#3b82f6',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                      <span>{t('female')}</span>
                      <span style={{ color: 'var(--tg-theme-hint-color)' }}>{Math.round(femalePct)}%</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--tg-theme-bg-color)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, femalePct)}%`,
                          background: '#ec4899',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}
      </div>
      {(() => {
        const subs = Number(channel.subscribers) || 0;
        const rawViews = Number(channel.views) || 0;
        const minViews = Math.max(1, Math.floor(subs * 0.001));
        const views = Math.max(rawViews, minViews);
        const err = subs > 0 ? (views / subs) * 100 : null;
        return (
          <section style={{ marginTop: 24, marginBottom: 80 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t('engagement')}</h3>
            <div
              style={{
                padding: 20,
                borderRadius: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  marginBottom: 12,
                  color: err != null ? '#22c55e' : 'var(--tg-theme-text-color)',
                }}
              >
                {err != null ? `${Number(err.toFixed(1))}%` : '—'}
              </div>
              {err != null && (
                <div
                  style={{
                    height: 10,
                    borderRadius: 5,
                    background: 'var(--tg-theme-bg-color)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, err)}%`,
                      background: '#22c55e',
                      borderRadius: 5,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
                {t('viewsPerSubscribers')}
              </div>
            </div>
          </section>
        );
      })()}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          background: 'linear-gradient(to top, var(--tg-theme-bg-color) 70%, transparent)',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <a
          href={`/campaigns?channel=${params.id}`}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 448,
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #2481cc 0%, #6366f1 100%)',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 16,
            borderRadius: 12,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(36, 129, 204, 0.4)',
          }}
        >
          {t('placeAd')} {formatPriceInTon(String(channel.pricePerPostNano ?? 0))} TON
        </a>
      </div>
    </main>
  );
}
