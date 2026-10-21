import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';

export const metadata: Metadata = {
  title: 'OBN NATION — Connecting People',
  description: 'OBN NATION is a Nigerian community-driven decluttering and asset-liquidation marketplace.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0A0A0A' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-clip bg-bg font-sans text-white antialiased">
        <div className="mx-auto min-h-screen w-full max-w-screen480 px-4">{children}</div>
      </body>
    </html>
  );
}
