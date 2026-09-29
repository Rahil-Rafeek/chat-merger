import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Chat Merger — Merge AI Conversations Intelligently',
  description: 'Merge multiple AI chat conversations into one unified, context-aware conversation. Powered by intelligent deduplication, conflict detection, and contextual merging.',
  keywords: 'AI chat, merge conversations, AI assistant, context merging, chat merger',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
