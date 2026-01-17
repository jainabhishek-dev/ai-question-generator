"use client";

import { useState, FormEvent } from 'react';
import { UserIcon, AcademicCapIcon, ClockIcon, FireIcon } from '@heroicons/react/24/outline';

interface QuizWelcomeScreenProps {
  gameTitle: string;
  gameDescription?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  gradeLevel?: string;
  numberOfQuestions?: number;
  timeLimit?: number;
  lives?: number;
  onStart: (playerName: string) => void;
}

export default function QuizWelcomeScreen({
  gameTitle,
  gameDescription,
  subject,
  topic,
  difficulty,
  gradeLevel,
  numberOfQuestions,
  timeLimit,
  lives,
  onStart
}: QuizWelcomeScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = (name: string): string | null => {
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return 'Please enter your name';
    }
    
    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters';
    }
    
    if (trimmedName.length > 30) {
      return 'Name must be less than 30 characters';
    }
    
    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validNameRegex.test(trimmedName)) {
      return 'Name can only contain letters, numbers, spaces, and basic punctuation (-, _, .)';
    }
    
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateName(playerName);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    onStart(playerName.trim());
  };

  const handleNameChange = (value: string) => {
    setPlayerName(value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <AcademicCapIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {gameTitle}
            </h1>
            {gameDescription && (
              <p className="text-blue-100 text-lg max-w-xl mx-auto">
                {gameDescription}
              </p>
            )}
          </div>

          {/* Game Info Section */}
          <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-3 justify-center">
              {subject && (
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  📚 {subject}
                </span>
              )}
              {topic && (
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium rounded-full">
                  🎯 {topic}
                </span>
              )}
              {difficulty && (
                <span className={`px-4 py-2 text-sm font-medium rounded-full ${
                  difficulty === 'easy'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : difficulty === 'medium'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                  {difficulty === 'easy' ? '⭐' : difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'} {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
              )}
              {gradeLevel && (
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm font-medium rounded-full">
                  🎓 {gradeLevel}
                </span>
              )}
            </div>

            {/* Quiz Stats */}
            {(numberOfQuestions || timeLimit || lives) && (
              <div className="flex flex-wrap gap-6 justify-center mt-6">
                {numberOfQuestions && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xl">❓</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Questions</div>
                      <div className="font-semibold">{numberOfQuestions}</div>
                    </div>
                  </div>
                )}
                {timeLimit && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Time Limit</div>
                      <div className="font-semibold">{Math.floor(timeLimit / 60)}:{(timeLimit % 60).toString().padStart(2, '0')}</div>
                    </div>
                  </div>
                )}
                {lives && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <FireIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Lives</div>
                      <div className="font-semibold">{lives}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name Input Section */}
          <form onSubmit={handleSubmit} className="px-8 py-10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Ready to Start?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your name to begin the quiz
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter your name..."
                  className={`
                    w-full px-6 py-4 text-lg border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all
                    ${error 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    }
                    dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500
                  `}
                  autoFocus
                  maxLength={30}
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Your name will be visible on the leaderboard
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || playerName.trim().length === 0}
                className="
                  w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                  disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
                  text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <span>Start Quiz</span>
                    <span className="text-2xl">🚀</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">Enter</kbd> to start
              </p>
            </div>
          </form>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>Good luck! 🍀 Do your best and have fun!</p>
        </div>
      </div>
    </div>
  );
}
