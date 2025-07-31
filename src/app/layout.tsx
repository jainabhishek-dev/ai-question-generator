import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Question Generator",
  description: "Generate educational questions with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProviders>
          {/* Navigation Bar */}
          <nav className="w-full bg-white border-b shadow-sm mb-8">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-gray-900 hover:text-blue-700">AI Question Generator</a>
              <div className="flex gap-4">
                <a href="/my-questions" className="text-gray-700 hover:text-blue-600 font-medium">My Questions</a>
              </div>
            </div>
          </nav>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
