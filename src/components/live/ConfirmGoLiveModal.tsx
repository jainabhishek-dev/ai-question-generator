'use client';

import React, { useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import Portal from '@/components/Portal';

interface ConfirmGoLiveModalProps {
  gameTitle: string;
  onClose: () => void;
  onConfirm: (participantLimit: number) => Promise<void>;
}

export default function ConfirmGoLiveModal({
  gameTitle,
  onClose,
  onConfirm
}: ConfirmGoLiveModalProps) {
  const [participantLimit, setParticipantLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm(participantLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live session');
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[scale-in_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Go Live
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {gameTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You will control the quiz flow</li>
                  <li>Participants will join using a PIN</li>
                  <li>You won&apos;t be answering questions yourself</li>
                  <li>Session will be deleted after 30 min of inactivity</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Participant Limit */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Participant Limit
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={participantLimit}
              onChange={(e) => setParticipantLimit(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum number of participants who can join (1-200)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                'Start Live Session'
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Portal>
  );
}
