import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: "H-BAT | Rhythm Perception Test",
  description: "H-BAT (Rhythm Perception Test) - リズム知覚能力のオンライン評価システム",
  viewport: "width=device-width, initial-scale=1",
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
