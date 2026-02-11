'use client';

import { useEffect, useRef } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { toast } from 'sonner';
import { t } from '../../lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'wallet_synced_this_session';

export function WalletSync() {
  const address = useTonAddress();
  const prevAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (!address) {
      prevAddressRef.current = null;
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === address) {
      return;
    }

    const wasEmpty = prevAddressRef.current === null || prevAddressRef.current === '';
    prevAddressRef.current = address;
    const currentAddress = address;

    const controller = new AbortController();

    fetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ walletAddress: address }),
      signal: controller.signal,
    })
      .then((res) => {
        if (prevAddressRef.current !== currentAddress) return;
        if (res.ok) {
          sessionStorage.setItem(STORAGE_KEY, currentAddress);
          if (wasEmpty) {
            toast.success(t('walletSyncedToast'));
          }
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        toast.error(`Sync failed: ${err?.message ?? String(err)}`);
      });

    return () => controller.abort();
  }, [address]);

  return null;
}
