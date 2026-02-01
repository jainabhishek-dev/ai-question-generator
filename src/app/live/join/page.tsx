'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hash, AlertCircle } from 'lucide-react';
import SimpleSpinner from '@/components/SimpleSpinner';

function JoinLivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPin = searchParams?.get('pin') || '';

  const [pin, setPin] = useState(prefilledPin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/live/sessions/validate-pin?pin=${pin}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      // Check if session is full
      if (data.participant_count >= data.session.participant_limit) {
        throw new Error('This session is full');
      }

      // Navigate to nickname selection
      router.push(`/live/join/${pin}`);
    } catch (err) {
      console.error('Error validating PIN:', err);
      setError(err instanceof Error ? err.message : 'Invalid PIN');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Hash className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Join Live Quiz
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter the 6-digit PIN to join
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PIN Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Game PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="000000"
              disabled={loading}
              className="w-full px-6 py-4 text-center text-4xl font-bold tracking-widest font-mono border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Ask the host for the PIN
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pin.length !== 6 || loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <SimpleSpinner />
                Joining...
              </span>
            ) : (
              'Join Game'
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have a PIN?<br />
            Ask your quiz host to share it with you.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinLivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <SimpleSpinner />
      </div>
    }>
      <JoinLivePageContent />
    </Suspense>
  );
}
