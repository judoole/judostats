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
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <nav className="bg-gradient-to-r from-blue-700 to-blue-800 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-white hover:text-gray-200 transition-colors">
                  🥋 Judo Stats
                </Link>
              </div>
              <div className="flex items-center space-x-1">
                <Link
                  href="/dashboard"
                  className="text-gray-200 hover:text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/techniques"
                  className="text-gray-200 hover:text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Techniques
                </Link>
                <Link
                  href="/judoka"
                  className="text-gray-200 hover:text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Judoka
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
