
'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Provider } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [providerLoading, setProviderLoading] = useState<string | null>(null)
  const isMounted = useRef(true)

  const { signIn, signUp, signInWithProvider } = useAuth()

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let timeout: NodeJS.Timeout | null = null;
    try {
      timeout = setTimeout(() => {
        if (isMounted.current) setError('Request is taking too long. Please check your connection.');
      }, 15000); // 15s timeout

      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!isMounted.current) return;
      if (result.success) {
        onClose();
        setEmail('');
        setPassword('');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch {
      if (isMounted.current) setError('An unexpected error occurred');
    } finally {
      if (timeout) clearTimeout(timeout);
      if (isMounted.current) setLoading(false);
    }
  };

  // Real provider sign-in: triggers Supabase OAuth flow
  const handleProviderSignIn = async (provider: Provider) => {
    setProviderLoading(provider);
    setError('');
    try {
      const result = await signInWithProvider(provider);
      // On success, Supabase will redirect to Google and then back to your app.
      if (!result.success && isMounted.current) {
        setError(result.error || 'Provider sign-in failed.');
      }
    } catch {
      if (isMounted.current) setError('Provider sign-in failed.');
    } finally {
      if (isMounted.current) setProviderLoading(null);
    }
  };

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md dark:bg-gray-900 dark:border dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Social sign-in options (future extensibility) */}
        <div className="mb-4 flex flex-col gap-2">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-2 px-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50 shadow-sm transition-all"
            onClick={() => handleProviderSignIn('google' as Provider)}
            disabled={!!providerLoading}
            aria-label="Sign in with Google"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_993_771)">
                <path d="M19.805 10.2305C19.805 9.55078 19.7484 8.86719 19.6266 8.19922H10.2V12.0508H15.6406C15.4156 13.2812 14.6734 14.332 13.6266 15.025V17.275H16.805C18.605 15.6172 19.805 13.1953 19.805 10.2305Z" fill="#4285F4"/>
                <path d="M10.2 20C12.7 20 14.7891 19.1797 16.405 17.675L13.6266 15.025C12.7266 15.625 11.5734 15.9844 10.2 15.9844C7.78906 15.9844 5.72656 14.3125 4.97344 12.1172H1.62659V14.4453C3.27344 17.6172 6.57344 20 10.2 20Z" fill="#34A853"/>
                <path d="M4.97344 12.1172C4.77344 11.5172 4.65937 10.8828 4.65937 10.2344C4.65937 9.58594 4.77344 8.95156 4.97344 8.35156V6.02344H1.62659C0.959375 7.35156 0.6 8.82812 0.6 10.2344C0.6 11.6406 0.959375 13.1172 1.62659 14.4453L4.97344 12.1172Z" fill="#FBBC05"/>
                <path d="M10.2 4.48438C11.4641 4.48438 12.5953 4.92188 13.4891 5.76562L16.4687 2.76562C14.7891 1.19531 12.7 0.234375 10.2 0.234375C6.57344 0.234375 3.27344 2.61719 1.62659 5.78906L4.97344 8.11719C5.72656 5.92188 7.78906 4.48438 10.2 4.48438Z" fill="#EA4335"/>
              </g>
              <defs>
                <clipPath id="clip0_993_771">
                  <rect width="20" height="20" fill="white"/>
                </clipPath>
              </defs>
            </svg>
            <span className="font-medium text-gray-700 dark:text-gray-100 text-base">
              {providerLoading === 'google' ? 'Signing in with Google...' : 'Continue with Google'}
            </span>
          </button>
          {/* Add more providers here as needed */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm dark:text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !!providerLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            disabled={loading || !!providerLoading}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  )
}