import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "H-BAT - Hearing-Based Audio Tests",
  description: "リズム知覚能力測定のためのWebアプリケーション。聴力閾値測定、拍子判定、テンポ変化、複雑リズム認識テストを提供します。",
  keywords: ["聴力測定", "リズム知覚", "音響テスト", "BST", "BIT", "BFIT"],
  authors: [{ name: "H-BAT Development Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow", // 研究用アプリのため検索エンジンからは除外
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
