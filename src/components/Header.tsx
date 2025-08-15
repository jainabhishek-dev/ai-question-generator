"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect, ReactElement } from "react"

type HeaderProps = {
  onSignIn?: () => void
}

export default function Header({ onSignIn }: HeaderProps): ReactElement {
  const { user, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md border-b shadow-sm z-50">
      <div className="max-w-full sm:max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="font-bold text-base sm:text-xl text-blue-700 tracking-tight">
              Create Questions
            </span>
          </Link>
        {/* Vertical separator */}
        <div className="hidden sm:block h-7 border-l border-gray-300 mx-2"></div>

          {/* Primary nav (collapse label size on mobile) */}
          <nav className="flex gap-3 sm:gap-6">
            <Link href="/my-questions" className="hover:text-blue-800">
              <span className="font-medium text-sm sm:text-base text-blue-700 tracking-tight">
                My Questions
              </span>
            </Link>
          </nav>
        </div>

        {/* Right: Account */}
        <div className="relative" ref={dropdownRef}>
          {loading ? (
            <span className="text-gray-500 text-sm sm:text-base">Loading...</span>
          ) : user ? (
            <button
              className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-100 focus:outline-none"
              onClick={() => setDropdownOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm sm:text-base">
                {getInitials(user.email || "")}
              </span>
              <span className="hidden sm:block text-gray-800 font-medium truncate max-w-[180px]">
                {user.email}
              </span>
              <svg
                className="w-4 h-4 ml-0.5 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <button
              className="btn-primary px-3 py-2 sm:px-4 sm:py-2"
              onClick={onSignIn}
            >
              Sign In / Sign Up
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && user && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg py-2 z-50"
            >
              <div className="px-4 py-2 text-gray-900 font-semibold border-b truncate">
                {user.email}
              </div>
              <Link href="/my-account" className="block px-4 py-2 hover:bg-gray-100 text-sm sm:text-base" role="menuitem">
                My Account
              </Link>
              <button
                onClick={signOut}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm sm:text-base"
                role="menuitem"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}