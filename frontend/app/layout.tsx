import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ton Ad Marketplace',
  description: 'MVP advertising marketplace for Telegram channels',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
