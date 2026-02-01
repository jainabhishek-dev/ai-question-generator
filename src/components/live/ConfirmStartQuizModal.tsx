'use client';

import React from 'react';
import { X, Users, PlayCircle } from 'lucide-react';
import Portal from '@/components/Portal';

interface ConfirmStartQuizModalProps {
  participantCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmStartQuizModal({
  participantCount,
  onConfirm,
  onCancel
}: ConfirmStartQuizModalProps) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[scale-in_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Start Quiz?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ready to begin the live quiz session
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Participant Count */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {participantCount} Participant{participantCount !== 1 ? 's' : ''} Ready
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  All participants will see a countdown before the quiz begins
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mb-6 text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              You will control the quiz flow
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              Participants will see each question on their screens
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              Click &quot;Next Question&quot; to advance after each question
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start Quiz
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
