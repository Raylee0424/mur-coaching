import type { Metadata } from 'next';
import { Instrument_Sans, Plus_Jakarta_Sans, Source_Code_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const display = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body' });
const mono = Source_Code_Pro({ subsets: ['latin'], weight: ['600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Ray Coaching',
  description: 'Coach-built programs and a progressive-overload engine that tells you when to add weight or deload.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
