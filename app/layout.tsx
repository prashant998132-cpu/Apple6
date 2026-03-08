import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import PinLock from '@/components/PinLock';

export const metadata: Metadata = {
  title: 'JARVIS AI',
  description: 'Your Personal AI Assistant',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'JARVIS' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  other: { 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  userScalable: false, themeColor: '#0a0b0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0a0b0f] text-gray-100 overflow-hidden" style={{ height: '100dvh' }}>
        <PinLock>
          <main className="h-full overflow-hidden" style={{ paddingBottom: '56px' }}>
            {children}
          </main>
          <BottomNav />
        </PinLock>
      </body>
    </html>
  );
}
