import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UploadProvider } from '@/context/upload-provider';
import { UploadStatusPanel } from '@/components/upload-status-panel';
import SiteFooter from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'eDocket — Secure media gallery',
  description: 'Mobile-first, fast, and secure media gallery.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="theme-color" content="#0EA5A4" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <UploadProvider>
          <div className="pb-16">
            {children}
          </div>
          <SiteFooter />
          <UploadStatusPanel />
          <Toaster />
        </UploadProvider>
      </body>
    </html>
  );
}

