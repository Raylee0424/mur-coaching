import type { Metadata } from 'next';
import { Instrument_Sans, Plus_Jakarta_Sans, Source_Code_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});
const body = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});
const mono = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'MUR Coaching',
  description: 'Coach-built programs. The next weight comes from the last three logged sessions.',
};

export const viewport = { themeColor: '#0A0C10' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
