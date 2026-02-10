import type { Metadata } from 'next';
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){var s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.async=true;document.head.appendChild(s);})();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
