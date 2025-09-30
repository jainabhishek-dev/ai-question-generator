"use client"

import { Geist, Geist_Mono as GeistMono } from "next/font/google"
import { ChevronRightIcon, ChevronLeftIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import "./globals.css"
import ClientProviders from "./ClientProviders"
import Header from "@/components/Header"
import { useState, useRef, useEffect } from "react"
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
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Focus trap for sidebar (mobile only)
  useEffect(() => {
    if (!sidebarOpen) return;
    // Only trap focus on mobile (md:hidden)
    const mq = window.matchMedia('(max-width: 767px)');
    if (!mq.matches) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    // Get all focusable elements
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input[type="text"]:not([disabled])', 'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ];
    const focusableEls = sidebar.querySelectorAll(focusableSelectors.join(','));
    const firstEl = focusableEls[0] as HTMLElement;
    const lastEl = focusableEls[focusableEls.length - 1] as HTMLElement;
    // Focus the first element
    if (firstEl) firstEl.focus();
    function handleTrap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (focusableEls.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener('keydown', handleTrap);
    return () => document.removeEventListener('keydown', handleTrap);
  }, [sidebarOpen]);

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
              ref={sidebarRef}
              className={`
                fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white
                transition-all duration-300 ease-in-out
                overflow-y-auto overflow-x-hidden
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                ${collapsed ? "w-20" : "w-60"}
              `}
              tabIndex={sidebarOpen ? 0 : -1}
              aria-modal={sidebarOpen ? "true" : undefined}
              role={sidebarOpen ? "dialog" : undefined}
            >
              {/* collapse / expand button (desktop only) */}
              <button
                onClick={() => setCollapsed(v => !v)}
                aria-label="Toggle collapse"
                className="hidden md:flex items-center justify-center h-12 text-gray-400 hover:text-white"
              >
                {collapsed ? (
                  <ChevronRightIcon className="w-5 h-5 transition-transform" />
                ) : (
                  <ChevronLeftIcon className="w-5 h-5 transition-transform" />
                )}
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
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
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
