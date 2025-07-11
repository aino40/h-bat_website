import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'
import { AudioProvider } from '@/contexts/AudioContext'
import { PWAProvider } from '../components/PWAProvider'

export const metadata: Metadata = {
  title: "H-BAT | Rhythm Perception Test",
  description: "H-BAT (Rhythm Perception Test) - リズム知覚能力のオンライン評価システム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "H-BAT",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: "#2563eb",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <PWAProvider>
          <AuthProvider>
            <AudioProvider autoInitialize={false}>
              {children}
            </AudioProvider>
          </AuthProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
