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
      <body className={`${inter.className} antialiased bg-white flex flex-col min-h-screen`}>
        <nav className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/" className="text-xl sm:text-2xl font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                  🥋 <span className="hidden sm:inline">Judo Stats</span>
                </Link>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                  title="Dashboard"
                >
                  <span className="text-lg sm:text-base">📊</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  href="/techniques"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                  title="Techniques"
                >
                  <span className="text-lg sm:text-base">🎯</span>
                  <span className="hidden sm:inline">Techniques</span>
                </Link>
                <Link
                  href="/judoka"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                  title="Judoka"
                >
                  <span className="text-lg sm:text-base">👤</span>
                  <span className="hidden sm:inline">Judoka</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex-1">
          <Providers>{children}</Providers>
        </div>
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/judoole/judostats';
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const currentYear = new Date().getFullYear();

  return (
      <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/techniques" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Techniques
                </Link>
              </li>
              <li>
                <Link href="/judoka" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Judoka
                </Link>
              </li>
            </ul>
          </div>

          {/* Data Source */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Data Source</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://data.ijf.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  IJF Data API
                </a>
              </li>
              <li>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Source Code
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-2">
              {contactEmail && (
                <li>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`${repoUrl}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub Issues
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/judoole"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  aria-label="X (Twitter) @judoole"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Notice */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal</h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-2">
              All competition data is owned by the <strong>International Judo Federation (IJF)</strong>. 
              This is an independent, non-commercial project for educational purposes.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              © {currentYear} Judo Stats. Not affiliated with IJF.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

