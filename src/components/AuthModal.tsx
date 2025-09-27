
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
    } catch (err) {
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
    } catch (err) {
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
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 px-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handleProviderSignIn('google' as Provider)}
            disabled={!!providerLoading}
            aria-label="Sign in with Google"
          >
            {providerLoading === 'google' ? 'Signing in with Google...' : 'Continue with Google'}
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