import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'PollWave — Create polls, collect votes in real time',
    template: '%s · PollWave',
  },
  description:
    'PollWave is a real-time poll & voting platform. Create interactive polls, share them anywhere, and watch results update live.',
  keywords: ['polls', 'voting', 'survey', 'realtime', 'strawpoll'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
