"use client";

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface QuizAnswer {
  questionIndex: number;
  questionId?: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  timeTaken: number;
  pointsEarned: number;
}

interface QuizReviewProps {
  answers: QuizAnswer[];
}

export default function QuizReview({ answers }: QuizReviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (!answers || answers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No answers to review
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {answers.map((answer, index) => (
        <div
          key={index}
          className={`
            border-2 rounded-lg overflow-hidden transition-all
            ${answer.isCorrect 
              ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
              : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
            }
          `}
        >
          {/* Question Header - Always Visible */}
          <button
            onClick={() => toggleExpand(index)}
            className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {answer.isCorrect ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* Question Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Question {index + 1}
                </span>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full font-medium
                  ${answer.isCorrect 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }
                `}>
                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {answer.timeTaken.toFixed(1)}s
                </span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                {answer.question}
              </p>
            </div>

            {/* Expand Icon */}
            <div className="flex-shrink-0">
              {expandedIndex === index ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Details */}
          {expandedIndex === index && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              {/* Full Question */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Question
                </h4>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {answer.question}
                </p>
              </div>

              {/* Your Answer */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Your Answer
                </h4>
                <p className={`
                  text-sm font-medium px-3 py-2 rounded-lg
                  ${answer.isCorrect 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }
                `}>
                  {answer.userAnswer}
                </p>
              </div>

              {/* Correct Answer (if wrong) */}
              {!answer.isCorrect && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    Correct Answer
                  </h4>
                  <p className="text-sm font-medium px-3 py-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {answer.correctAnswer}
                  </p>
                </div>
              )}

              {/* Explanation */}
              {answer.explanation && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    Explanation
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {answer.explanation}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Time: {answer.timeTaken.toFixed(1)}s</span>
                <span>Points: {answer.pointsEarned > 0 ? '+' : ''}{answer.pointsEarned}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
