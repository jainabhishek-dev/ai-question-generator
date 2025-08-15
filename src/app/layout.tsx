"use client"

import { Geist, Geist_Mono as GeistMono } from "next/font/google"
import "./globals.css"
import ClientProviders from "./ClientProviders"
import Header from "@/components/Header"
import { useState } from "react"
import AuthModal from "@/components/AuthModal"
import Footer from "@/components/footer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = GeistMono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* Critical for proper mobile scaling */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        <ClientProviders>
          <Header onSignIn={() => setShowAuthModal(true)} />
          {/* Header height offset */}
          <div className="pt-20">
            {children}
          </div>
          <Footer />
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </ClientProviders>
      </body>
    </html>
  )
}