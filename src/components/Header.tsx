"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect, ReactElement } from "react"
import { usePathname } from "next/navigation"
import {
  ClipboardDocumentListIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
  ChevronDownIcon
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
  const pathname = usePathname() || "";
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
    const firstDropdownItemRef = useRef<HTMLAnchorElement>(null);
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

  // Keyboard accessibility for avatar button
  const handleAvatarKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDropdownOpen(v => !v);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      avatarBtnRef.current?.focus();
    }
  };
  
  /* close account dropdown on outside-click and Escape key */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        avatarBtnRef.current?.focus();
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

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
  <div className="flex flex-col h-full min-w-0 select-none relative bg-gray-950 md:bg-transparent transition-colors duration-300 overflow-hidden">
      {/* ─── Cross (close) button, visible only on mobile ─── */}
      <button
        className="absolute top-4 left-4 z-50 md:hidden transition-transform duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sidebar-close"));
          }
        }}
        aria-label="Close sidebar"
        aria-controls="sidebar-navigation"
      >
        <XMarkIcon className="w-6 h-6 text-white" />
      </button>

      {/* ─── Logo and Navigation links, stacked and top-aligned below cross ─── */}
  <div className="flex flex-col gap-4 mt-14 md:mt-0 px-2 md:px-0 flex-shrink-0" role="navigation" aria-label="Sidebar navigation" id="sidebar-navigation">
        <Link
          href="/"
          onClick={handleNavClick}
          className={`flex items-center gap-2 transition-all ${pad} hover:bg-gray-900 hover:scale-[1.03] focus:bg-gray-900 focus:scale-[1.03] active:scale-[0.98] rounded-lg ${pathname === '/' ? 'bg-gray-800 scale-[1.03]' : ''}`}
        >
          <Image src="/logo.png" alt="Logo" width={28} height={28} className="h-7 w-7 flex-shrink-0" priority />
          <span className={`font-bold text-lg text-blue-200 tracking-tight transition-opacity duration-200 ${hide}`}>
            Instaku
          </span>
        </Link>
  <nav className="flex flex-col gap-2" aria-label="Main sidebar links">
          <Link
            href="/my-questions"
            onClick={handleNavClick}
            className={`flex items-center gap-3 py-2 rounded-lg hover:bg-gray-800 hover:scale-[1.03] focus:bg-gray-800 focus:scale-[1.03] active:scale-[0.98] transition-all ${pad} ${pathname.startsWith('/my-questions') ? 'bg-gray-800 scale-[1.03]' : ''}`}
            aria-label="My Questions"
          >
            <ClipboardDocumentListIcon className="w-6 h-6 flex-shrink-0" />
            <span className={`text-sm font-medium ${hide}`}>My Questions</span>
          </Link>
        </nav>
      </div>

      {/* ─── Account section ─── */}
  <div className="pt-4 border-t border-gray-700 px-2 md:px-0 flex-shrink-0" style={{marginTop: "auto"}}>
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
              onKeyDown={handleAvatarKeyDown}
              className={`flex items-center py-2 rounded-lg hover:bg-gray-800 hover:scale-[1.03] focus:bg-gray-800 focus:scale-[1.03] active:scale-[0.98] transition-all shadow-sm focus:shadow-md
                ${collapsed ? "justify-center px-3" : "text-left px-3 w-full gap-3"}
              `}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              aria-label="Account menu"
              tabIndex={0}
            >
              <span className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base flex-shrink-0">
                {getInitials(user.email)}
              </span>
              <span className={`flex-1 min-w-0 text-gray-100 font-medium truncate ${hide}`}>
                {user.email}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""} ${hide}`}
              />
            </button>
          ) : (
            <button
              onClick={() => {
                onSignIn?.()
                handleNavClick()
              }}
              className={`bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 active:bg-blue-900 text-white font-medium rounded-lg transition-all py-1 ${pad} flex items-center justify-center mx-6 my-2 shadow-sm hover:shadow-md focus:shadow-md active:scale-[0.98]`}
              aria-label="Sign In or Sign Up"
            >
              {collapsed ? (
                <ArrowRightStartOnRectangleIcon className="w-7 h-5" />
              ) : (
                <>
                  <span className={hide}>Sign In / Sign Up</span>
                  <ArrowRightStartOnRectangleIcon className="w-5 h-5 ml-2" />
                </>
              )}
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
                    maxWidth: "20rem",
                    zIndex: 9999,
                    maxHeight: "calc(100vh - 32px)", // Prevents overflow
                    overflowY: "auto", // Scroll if needed
                    overflowX: "hidden", // Prevent horizontal scroll
                    transition: "opacity 200ms, transform 200ms",
                    opacity: dropdownActive ? 1 : 0,
                    transform: dropdownActive ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
                    pointerEvents: dropdownOpen ? "auto" : "none",
                  }}
                  className="bg-white text-gray-900 border rounded-xl shadow-2xl py-2 transition-all duration-200"
                >
                  <div className="px-4 py-2 font-semibold border-b truncate whitespace-nowrap">{user.email}</div>
                  <Link
                    href="/my-account"
                    role="menuitem"
                    aria-label="Go to My Account"
                    onClick={() => {
                      setDropdownOpen(false)
                      handleNavClick()
                    }}
                    className="block px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all whitespace-nowrap"
                    ref={firstDropdownItemRef}
                    tabIndex={0}
                  >
                    My Account
                  </Link>
                  <button
                    role="menuitem"
                    aria-label="Sign Out"
                    onClick={async () => {
                      const result = await signOut();
                      setDropdownOpen(false);
                      handleNavClick();
                      if (!result.success) {
                        alert(result.error || 'Sign out failed.');
                      }
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all whitespace-nowrap"
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
                  min-w-[13rem] max-w-[20rem] overflow-x-hidden
                  bg-white text-gray-900 border rounded-xl shadow-xl py-2 z-[9999] transition-all duration-200
                `}
                style={{ minWidth: "13rem", maxWidth: "20rem" }}
              >
                <div className="px-4 py-2 font-semibold border-b truncate whitespace-nowrap">{user.email}</div>
                <Link
                  href="/my-account"
                  role="menuitem"
                  aria-label="Go to My Account"
                  onClick={() => {
                    setDropdownOpen(false)
                    handleNavClick()
                  }}
                  className="block px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all whitespace-nowrap"
                  ref={firstDropdownItemRef}
                  tabIndex={0}
                >
                  My Account
                </Link>
                <button
                  role="menuitem"
                  aria-label="Sign Out"
                  onClick={async () => {
                    const result = await signOut();
                    setDropdownOpen(false);
                    handleNavClick();
                    if (!result.success) {
                      alert(result.error || 'Sign out failed.');
                    }
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all whitespace-nowrap"
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
  /* Horizontal header – unchanged except accessibility */
  return (
  <header className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md border-b shadow-sm z-50">
  <div className="max-w-full sm:max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
        {/* Logo + Nav */}
  <div className="flex items-center gap-3 sm:gap-6" role="navigation" aria-label="Header navigation">
          <Link href="/" className={`flex items-center gap-2 hover:bg-gray-100 hover:scale-[1.03] focus:bg-gray-100 focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all ${pathname === '/' ? 'bg-blue-50 scale-[1.03]' : ''}`} aria-label="Home">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="h-7 w-7 sm:h-8 sm:w-8" priority />
            <span className="font-bold text-base sm:text-xl text-blue-700 tracking-tight">
              Instaku
            </span>
          </Link>
          <div className="hidden sm:block h-7 border-l border-gray-300 mx-2" />
          <nav className="flex gap-3 sm:gap-6" aria-label="Main header links">
            <Link href="/my-questions" className={`hover:text-blue-800 hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all ${pathname.startsWith('/my-questions') ? 'bg-blue-100 scale-[1.03] font-semibold text-blue-900' : ''}`} aria-label="My Questions">
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
              className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-100 hover:scale-[1.03] focus:bg-gray-100 focus:scale-[1.03] shadow-sm focus:shadow-md active:scale-[0.98] transition-all"
              onClick={() => setDropdownOpen(v => !v)}
              onKeyDown={handleAvatarKeyDown}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              aria-label="Account menu"
              ref={avatarBtnRef}
              tabIndex={0}
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm sm:text-base">
                {getInitials(user.email || "")}
              </span>
              <span className="hidden sm:block text-gray-800 font-medium truncate max-w-[180px]">
                {user.email}
              </span>
              <ChevronDownIcon className="w-4 h-4 ml-0.5 text-gray-500" aria-hidden="true" />
            </button>
          ) : (
            <button
              className="btn-primary px-3 py-2 sm:px-4 sm:py-2 hover:bg-blue-700 focus:bg-blue-800 active:bg-blue-900 hover:scale-[1.03] focus:scale-[1.03] shadow-sm focus:shadow-md active:scale-[0.98] transition-all"
              onClick={onSignIn}
              aria-label="Sign In or Sign Up"
            >
              Sign In / Sign Up
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && user && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg py-2 z-50 transition-all duration-200"
              style={{
                transition: "opacity 200ms, transform 200ms",
                opacity: dropdownOpen ? 1 : 0,
                transform: dropdownOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
              }}
            >
              <div className="px-4 py-2 text-gray-900 font-semibold border-b truncate">
                {user.email}
              </div>
              <Link href="/my-account" className="block px-4 py-2 hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all text-sm sm:text-base" role="menuitem" aria-label="Go to My Account" ref={firstDropdownItemRef} tabIndex={0}>
                My Account
              </Link>
              <button
                onClick={async () => {
                  const result = await signOut();
                  setDropdownOpen(false);
                  if (!result.success) {
                    alert(result.error || 'Sign out failed.');
                  }
                }}
                className="block w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-100 active:bg-blue-200 hover:scale-[1.03] focus:scale-[1.03] active:scale-[0.98] rounded-lg transition-all text-sm sm:text-base"
                role="menuitem"
                aria-label="Sign Out"
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