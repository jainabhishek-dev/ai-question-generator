"use client"

import { Geist, Geist_Mono as GeistMono } from "next/font/google"
import "./globals.css"
import ClientProviders from "./ClientProviders"
import Header from "@/components/Header"
import { useState } from "react"
import AuthModal from "@/components/AuthModal"
import Footer from "@/components/footer"
import { Analytics } from "@vercel/analytics/react"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = GeistMono({ variable: "--font-geist-mono", subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  /* ───────────────────────────────── desktop / mobile state */
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(false)  // mobile drawer
  const [collapsed,   setCollapsed]     = useState(true)   // 56-px rail on ≥ md

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
        <ClientProviders>
          <div className="flex min-h-screen w-full">

            {/* ─────────── Sidebar ─────────── */}
            <aside
              className={`
                fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white
                transition-all duration-300 ease-in-out
                overflow-y-auto overflow-x-hidden
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                ${collapsed ? "w-20" : "w-60"}
              `}
            >
              {/* collapse / expand button (desktop only) */}
              <button
                onClick={() => setCollapsed(v => !v)}
                aria-label="Toggle collapse"
                className="hidden md:flex items-center justify-center h-12 text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} // ▶ when collapsed, ◀ when expanded
                  />
                </svg>
              </button>

              {/* Navigation / account */}
              <Header
                vertical
                collapsed={collapsed}
                onNavigate={() => {
                  setSidebarOpen(false);
                  setCollapsed(true); // Collapse sidebar when navigating
                }}
                onSignIn={() => setShowAuthModal(true)}
              />
            </aside>

            {/* ─── Mobile overlay (darken page when drawer is open) */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-30 md:hidden"
                onClick={() => {
                  setSidebarOpen(false);
                  setCollapsed(true); // Collapse sidebar when closing
                }}
              />
            )}

            {/* ─── Hamburger (mobile only) */}
            <button
              onClick={() => {
                setSidebarOpen(v => {
                  if (!v) setCollapsed(false); // Expand sidebar when opening
                  return !v;
                });
              }}
              aria-label="Toggle sidebar"
              className="fixed top-4 left-4 z-50 p-2 rounded bg-gray-900 text-white shadow-md md:hidden"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* ─────────── Main content ─────────── */}
              <main
                className={`
                  flex-1 min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden
                  ${collapsed ? "md:ml-14" : "md:ml-64"}
                `}
              >
              <div className="px-4 pb-8 pt-16 md:px-8 md:pt-2">
                {children}
                <Footer />
              </div>
            </main>
          </div>

          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </ClientProviders>

        <Analytics />
      </body>
    </html>
  )
}
