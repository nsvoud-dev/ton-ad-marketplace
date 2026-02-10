'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';

const manifestUrl =
  process.env.NEXT_PUBLIC_TON_CONNECT_MANIFEST_URL ||
  'https://your-domain.com/tonconnect-manifest.json';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
