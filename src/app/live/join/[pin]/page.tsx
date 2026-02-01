'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shuffle, User, AlertCircle } from 'lucide-react';
import { getRandomAvatar, AVATAR_EMOJIS } from '@/types/liveQuiz';
import SimpleSpinner from '@/components/SimpleSpinner';

export default function NicknameAvatarPage() {
  const router = useRouter();
  const params = useParams();
  const pin = params?.pin as string;

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(getRandomAvatar());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Validate PIN when page loads
    const validatePin = async () => {
      try {
        const response = await fetch(`/api/live/sessions/validate-pin?pin=${pin}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid PIN');
        }

        setSessionId(data.session.id);
      } catch (err) {
        console.error('Error validating PIN:', err);
        setError(err instanceof Error ? err.message : 'Invalid PIN');
      }
    };

    if (pin) {
      validatePin();
    }
  }, [pin]);

  const handleShuffleAvatar = () => {
    // Get a different avatar than the current one
    let newAvatar;
    do {
      newAvatar = getRandomAvatar();
    } while (newAvatar === avatar && AVATAR_EMOJIS.length > 1);
    setAvatar(newAvatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNickname = nickname.trim();

    // Validation
    if (trimmedNickname.length < 3) {
      setError('Nickname must be at least 3 characters');
      return;
    }

    if (trimmedNickname.length > 50) {
      setError('Nickname must be less than 50 characters');
      return;
    }

    if (!sessionId) {
      setError('Session not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/live/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          nickname: trimmedNickname,
          avatar
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      // Store participant ID in session storage for later use
      sessionStorage.setItem('live_participant_id', data.participant.id);
      sessionStorage.setItem('live_session_id', sessionId);

      // Navigate to waiting lobby
      router.push(`/live/participant/${sessionId}/waiting`);
    } catch (err) {
      console.error('Error joining session:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Choose Your Identity
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pick a nickname and avatar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selection */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Your Avatar
            </label>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-8xl">{avatar}</div>
            </div>
            <button
              type="button"
              onClick={handleShuffleAvatar}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle Avatar
            </button>
          </div>

          {/* Nickname Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError(null);
              }}
              placeholder="Enter your nickname"
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              3-50 characters, visible to all players
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
            disabled={nickname.trim().length < 3 || loading}
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
      </div>
    </div>
  );
}
