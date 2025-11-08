import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Judo Stats",
  description: "Judo competition technique data from IJF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-white`}>
        <nav className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                  🥋 Judo Stats
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span>📊</span>
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/techniques"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span>🎯</span>
                  <span>Techniques</span>
                </Link>
                <Link
                  href="/judoka"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span>👤</span>
                  <span>Judoka</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
