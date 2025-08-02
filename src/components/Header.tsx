"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

// Accept modal control as props
import { ReactElement } from "react";
type HeaderProps = {
  onSignIn?: () => void;
};

export default function Header({ onSignIn }: HeaderProps): ReactElement {
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b shadow-sm z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/">
            <span className="font-bold text-xl text-blue-700 tracking-tight">AI Question Generator</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/my-questions">
              <span className="text-gray-700 hover:text-blue-600 font-medium">My Questions</span>
            </Link>
          </nav>
        </div>
        {/* Right: Account */}
        <div className="relative" ref={dropdownRef}>
          {loading ? (
            <span className="text-gray-500">Loading...</span>
          ) : user ? (
            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 focus:outline-none"
              onClick={() => setDropdownOpen(v => !v)}
            >
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                {getInitials(user.email || "")}
              </span>
              <span className="hidden sm:block text-gray-800 font-medium">{user.email}</span>
              <svg className="w-4 h-4 ml-1 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              onClick={onSignIn}
            >
              Sign In / Sign Up
            </button>
          )}
          {/* Dropdown */}
          {dropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg py-2 z-50">
              <div className="px-4 py-2 text-gray-900 font-semibold border-b">{user.email}</div>
              <Link href="/my-account">
                <span className="block px-4 py-2 hover:bg-gray-100 cursor-pointer">My Account</span>
              </Link>
              <span className="block px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={signOut}>Sign Out</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
