import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'
import { AudioProvider } from '@/contexts/AudioContext'

export const metadata: Metadata = {
  title: "H-BAT | Rhythm Perception Test",
  description: "H-BAT (Rhythm Perception Test) - リズム知覚能力のオンライン評価システム",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>
          <AudioProvider autoInitialize={true}>
            {children}
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
