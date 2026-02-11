'use client';

import { useState, useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from 'sonner';
import { WalletSync } from './components/WalletSync';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [manifestUrl, setManifestUrl] = useState('');

  useEffect(() => {
    setIsMounted(true);
    setManifestUrl(`${window.location.origin}/api/tonconnect-manifest?v=${Date.now()}`);
  }, []);

  return (
    <>
      {isMounted && manifestUrl ? (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          <WalletSync />
          {children}
        </TonConnectUIProvider>
      ) : (
        <>{children}</>
      )}
      <Toaster position="top-center" expand={false} duration={2000} richColors />
    </>
  );
}
