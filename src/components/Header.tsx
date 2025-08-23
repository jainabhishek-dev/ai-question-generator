"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect, ReactElement } from "react"
import {
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline"
import Portal from "./Portal";    

type HeaderProps = {
  onSignIn?: () => void
  vertical?: boolean
  collapsed?: boolean  
  onNavigate?: () => void
}

export default function Header({
  onSignIn,
  vertical = false,
  collapsed = false,
  onNavigate,
}: HeaderProps): ReactElement {
  const { user, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false);

  useEffect(() => {
    if (dropdownOpen) {
      setDropdownVisible(true);
    } else {
      // Wait for animation to finish before removing from DOM
      const timeout = setTimeout(() => setDropdownVisible(false), 150); // match transition duration
      return () => clearTimeout(timeout);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownVisible) {
      // Next tick: activate transition
      setTimeout(() => setDropdownActive(true), 10);
    } else {
      setDropdownActive(false);
    }
  }, [dropdownVisible]);

  const handleAvatarClick = () => {
    setDropdownOpen(v => !v);
  };
  
  /* close account dropdown on outside-click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    if (dropdownOpen) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const handleNavClick = () => onNavigate?.()

  /* ─────────────────────────────────────────── */
  /* Vertical (sidebar) mode                     */
if (vertical) {
  /* helper classes when collapsed = true */
  const hide = collapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100"
  const pad  = collapsed ? "px-0 justify-center" : "px-3"

  return (
    <div className="flex flex-col h-full min-w-0 select-none relative">
      {/* ─── Cross (close) button, visible only on mobile ─── */}
      <button
        className="absolute top-4 left-4 z-50 md:hidden"
        onClick={() => {
          // You should call a prop or context to close the sidebar here
          // For example, if you pass a prop: onCloseSidebar?.()
          if (typeof window !== "undefined") {
            // fallback: trigger a custom event or use a prop
            window.dispatchEvent(new Event("sidebar-close"));
          }
        }}
        aria-label="Close sidebar"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* ─── Logo and Navigation links, stacked and top-aligned below cross ─── */}
      <div className="flex flex-col gap-4 mt-14 md:mt-0" >
        <Link
          href="/"
          onClick={handleNavClick}
          className={`flex items-center gap-2 transition-all ${pad}`}
        >
          <img src="/logo.png" alt="Logo" className="h-7 w-7 flex-shrink-0" />
          <span className={`font-bold text-lg text-blue-200 tracking-tight transition-opacity duration-200 ${hide}`}>
            Instaku
          </span>
        </Link>
        <nav className="flex flex-col gap-2">
          <Link
            href="/my-questions"
            onClick={handleNavClick}
            className={`flex items-center gap-3 py-2 rounded-lg hover:bg-gray-800 transition-colors ${pad}`}
          >
            <ClipboardDocumentListIcon className="w-6 h-6 flex-shrink-0" />
            <span className={`text-sm font-medium ${hide}`}>My Questions</span>
          </Link>
        </nav>
      </div>

      {/* ─── Account section ─── */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="relative" ref={dropdownRef}>
          {loading ? (
            <div className={`flex items-center gap-3 py-2 ${pad}`}>
              <div className="w-9 h-9 rounded-full bg-gray-700 animate-pulse" />
              <span className={`text-gray-300 text-sm ${hide}`}>Loading…</span>
            </div>
          ) : user ? (
            <button
              ref={avatarBtnRef}
              onClick={handleAvatarClick}
              className={`flex items-center gap-3 py-2 rounded-lg hover:bg-gray-800 w-full text-left transition-all ${pad}`}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              <span className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base flex-shrink-0">
                {getInitials(user.email)}
              </span>
              <span className={`flex-1 min-w-0 text-gray-100 font-medium truncate ${hide}`}>
                {user.email}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""} ${hide}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => {
                onSignIn?.()
                handleNavClick()
              }}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg w-full transition-colors py-2 ${pad}`}
            >
              <span className={hide}>Sign In / Sign Up</span>
              <svg
                className={`w-5 h-5 mx-auto ${collapsed ? "" : "hidden"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m3 3l-3-3 3-3" />
              </svg>
            </button>
          )}

          {/* Dropdown */}
          {dropdownVisible && user && (
            collapsed ? (
              <Portal>
                <div
                  ref={dropdownRef}
                  role="menu"
                  aria-label="Account menu"
                  style={{
                    position: "fixed",
                    left: 56 + 12,
                    bottom: 16,
                    minWidth: "16rem",
                    zIndex: 9999,
                    maxHeight: "calc(100vh - 32px)", // Prevents overflow
                    overflowY: "auto", // Scroll if needed
                    transition: "opacity 150ms, transform 150ms",
                    opacity: dropdownActive ? 1 : 0,
                    transform: dropdownActive ? "translateY(0)" : "translateY(16px)",
                    pointerEvents: dropdownOpen ? "auto" : "none",
                  }}
                  className="bg-white text-gray-900 border rounded-xl shadow-2xl py-2"
                >
                  <div className="px-4 py-2 font-semibold border-b truncate">{user.email}</div>
                  <Link
                    href="/my-account"
                    role="menuitem"
                    onClick={() => {
                      setDropdownOpen(false)
                      handleNavClick()
                    }}
                    className="block px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    My Account
                  </Link>
                  <button
                    role="menuitem"
                    onClick={() => {
                      signOut()
                      setDropdownOpen(false)
                      handleNavClick()
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </Portal>
            ) : (
              <div
                role="menu"
                aria-label="Account menu"
                className={`
                  absolute left-1/2 -translate-x-1/2 bottom-14
                  min-w-[13rem]
                  bg-white text-gray-900 border rounded-xl shadow-xl py-2
                  z-[9999]
                `}
                style={{ minWidth: "13rem" }}
              >
                <div className="px-4 py-2 font-semibold border-b truncate">{user.email}</div>
                <Link
                  href="/my-account"
                  role="menuitem"
                  onClick={() => {
                    setDropdownOpen(false)
                    handleNavClick()
                  }}
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  My Account
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    signOut()
                    setDropdownOpen(false)
                    handleNavClick()
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
    
  

  /* ─────────────────────────────────────────── */
  /* Horizontal header – unchanged               */
  return (
    <header className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md border-b shadow-sm z-50">
      <div className="max-w-full sm:max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
        {/* Logo + Nav */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="font-bold text-base sm:text-xl text-blue-700 tracking-tight">
              Instaku
            </span>
          </Link>
          <div className="hidden sm:block h-7 border-l border-gray-300 mx-2" />
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

