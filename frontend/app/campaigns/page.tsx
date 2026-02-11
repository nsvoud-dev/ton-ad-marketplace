'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { beginCell } from '@ton/ton';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/Skeleton';
import { getErrorMessage } from '../../lib/api-utils';
import { formatPriceInTon } from '../../lib/ton-utils';
import { useTranslation } from '../../lib/useTranslation';

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(arr).toString('base64');
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function CampaignForm({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Record<string, unknown> | null>(null);
  const [postText, setPostText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const address = useTonAddress();
  const hasNotifiedError = useRef(false);
  const [tonConnectUI] = useTonConnectUI();
  const notifiedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetch(`${API_URL}/api/channels/${channelId}/order-info`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(getErrorMessage(data, t('loadChannelError')));
        }
        return r.json();
      })
      .then((data) => {
        setChannel(data);
        if (data && !data.ownerWallet && !notifiedRef.current) {
          notifiedRef.current = true;
          fetch(`${API_URL}/api/channels/${channelId}/notify-interest`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t('loadError'));
        setChannel(null);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    hasNotifiedError.current = false;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    const ownerWallet = channel?.ownerWallet as string | undefined;
    if (!ownerWallet) {
      toast.error(t('noOwnerWallet'));
      setSubmitting(false);
      return;
    }

    const priceNano = String(channel?.pricePerPostNano ?? 0);

    try {
      const comment = `Реклама: ${String(channel?.title || channel?.username || channelId).slice(0, 50)}`;
      const payloadCell = beginCell()
        .storeUint(0, 32)
        .storeStringTail(comment)
        .endCell();
      const payloadB64 = uint8ArrayToBase64(payloadCell.toBoc());

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: ownerWallet,
            amount: priceNano,
            payload: payloadB64,
          },
        ],
      });

      const txBoc = (result as { boc?: string }).boc;
      if (!txBoc) {
        throw new Error(t('txNoBoc'));
      }

      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId,
          postText: postText.trim() || undefined,
          mediaUrl: mediaUrl.trim() || undefined,
          externalId: txBoc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('createCampaignError')));

      toast.success(t('txSentToast'));
      setSuccess(true);
      setTimeout(() => (window.location.href = '/campaigns'), 2000);
    } catch (err) {
      if (!hasNotifiedError.current) {
        hasNotifiedError.current = true;
        if (err instanceof Error && (err.message.includes('declined') || err.message.toLowerCase().includes('cancel'))) {
          toast.error(t('txDeclinedToast'));
        } else {
          toast.error(err instanceof Error ? err.message : t('txError'));
        }
      }
      setError(err instanceof Error ? err.message : t('txError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <Skeleton className="mb-4 h-4 w-28" />
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: 'var(--tg-theme-secondary-bg-color)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton className="mb-2 h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('postTextLabel')}
            <Skeleton className="mt-2 h-24 w-full rounded-lg" />
          </label>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('mediaUrlLabel')}
            <Skeleton className="mt-2 h-10 w-full rounded-lg" />
          </label>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: 'var(--tg-theme-secondary-bg-color)',
            }}
          >
            <Skeleton className="h-5 w-32" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </form>
      </main>
    );
  }
  if (!channel) return <main style={{ padding: 16 }}>{t('channelNotFound')}</main>;

  const priceNano = String(channel.pricePerPostNano ?? 0);
  const priceTon = formatPriceInTon(priceNano);
  const ownerWallet = channel.ownerWallet as string | undefined;

  if (success) {
    return (
      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#22c55e', fontSize: 18 }}>{t('orderSuccess')}</p>
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>{t('redirecting')}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <Link
        href={`/channels/${channelId}`}
        style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}
      >
        {t('backToChannel')}
      </Link>
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: 'var(--tg-theme-secondary-bg-color)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'var(--tg-theme-button-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#fff',
            }}
          >
            #
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{String(channel.title || channel.username || channel.id)}</h2>
            <p style={{ margin: 4, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
              {formatPriceInTon(priceNano)} {t('tonPerPost')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('postTextLabel')}
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder={t('postTextPlaceholder')}
            rows={4}
            style={{
              display: 'block',
              width: '100%',
              padding: 12,
              marginTop: 8,
              borderRadius: 8,
              color: 'var(--tg-theme-text-color)',
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              resize: 'vertical',
            }}
          />
        </label>
        <label style={{ color: 'var(--tg-theme-text-color)' }}>
          {t('mediaUrlLabel')}
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={t('mediaUrlPlaceholder')}
            style={{
              display: 'block',
              width: '100%',
              padding: 12,
              marginTop: 8,
              borderRadius: 8,
              color: 'var(--tg-theme-text-color)',
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
        </label>

        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: 'var(--tg-theme-secondary-bg-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('totalToPay')}</span>
            <strong style={{ fontSize: 18 }}>{priceTon} TON</strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ownerWallet ? (
            <>
              <TonConnectButton />
              <button
                type="submit"
                disabled={submitting || !address}
                style={{
                  padding: 16,
                  background:
                    address && !submitting
                      ? 'linear-gradient(135deg, #2481cc 0%, #6366f1 100%)'
                      : 'var(--tg-theme-secondary-bg-color)',
                  color: address && !submitting ? '#fff' : 'var(--tg-theme-hint-color)',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.8 : 1,
                }}
              >
                {address
                  ? submitting
                    ? t('creating')
                    : t('payWithWallet')
                  : t('connectWallet')}
              </button>
            </>
          ) : (
            <p
              style={{
                padding: 16,
                borderRadius: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-hint-color)',
                fontSize: 14,
              }}
            >
              {t('ownerNoWallet')}
            </p>
          )}
        </div>

        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      </form>
    </main>
  );
}

function CampaignsList() {
  const { t } = useTranslation();
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
      .catch(() => {
        toast.error(t('loadCampaignsError'));
        setCampaigns([]);
      });
  }, [t]);

  return (
    <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h1>{t('myCampaigns')}</h1>
      <Link href="/" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--tg-theme-link-color)' }}>
        {t('back')}
      </Link>
      {campaigns.length === 0 ? (
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>{t('noCampaigns')}</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {campaigns.map((c) => (
            <li
              key={String(c.id)}
              style={{
                padding: 12,
                marginBottom: 8,
                background: 'var(--tg-theme-secondary-bg-color)',
                borderRadius: 8,
              }}
            >
              <strong>{String((c as { briefTitle?: string }).briefTitle || (c as { briefDescription?: string }).briefDescription || c.id)}</strong>
              <br />
              <span style={{ color: 'var(--tg-theme-hint-color)' }}>Status: {String(c.status)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CampaignsSuspenseFallback() {
  const { t } = useTranslation();
  return <main style={{ padding: 16 }}>{t('loading')}</main>;
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<CampaignsSuspenseFallback />}>
      <CampaignsPageContent />
    </Suspense>
  );
}

function CampaignsPageContent() {
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel');

  if (channelId) {
    return <CampaignForm channelId={channelId} />;
  }

  return <CampaignsList />;
}
