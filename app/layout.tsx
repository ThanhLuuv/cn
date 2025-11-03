import '@/styles/globals.css';
import '@/styles/pronunciation.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/img/logo.png" type="image/png" sizes="any" />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}


