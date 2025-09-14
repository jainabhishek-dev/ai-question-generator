import React from "react"
import { CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface SuccessStatusProps {
  questionCount: number
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  user: { id: string; email?: string } | null | undefined
  onShowAuthModal: () => void
}

const SuccessStatus: React.FC<SuccessStatusProps> = ({
  questionCount,
  saveStatus,
  user,
  onShowAuthModal
}) => (
  <div className="space-y-4">
    <div className="card p-4 sm:p-6 bg-green-50/80 border-green-200/50 text-green-700 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 dark:text-green-300" />
        <span className="font-medium text-sm sm:text-base">
          Successfully generated {questionCount} question{questionCount !== 1 ? 's' : ''}
          {saveStatus === 'saving' && <span className="ml-2 text-blue-600 dark:text-blue-400">• Saving...</span>}
          {saveStatus === 'saved' && user && <span className="ml-2 text-green-600 dark:text-green-300">• Saved to My Questions</span>}
          {saveStatus === 'saved' && !user && (
            <span className="ml-2 text-orange-600 dark:text-orange-300">• Questions generated! Sign in to save to personal library</span>
          )}
        </span>
      </div>
    </div>

    {/* CTA for non-authenticated users */}
    {saveStatus === 'saved' && !user && (
      <div className="card p-4 sm:p-6 bg-blue-50/80 border-blue-200/50 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 dark:text-blue-300" />
            <span className="font-medium text-sm sm:text-base">Want to build a personal question library?</span>
          </div>
          <div>
            <button
              onClick={onShowAuthModal}
              className="btn-primary"
            >
              Sign up for free
            </button>
            <span className="ml-2 text-sm text-blue-800 dark:text-blue-200">to save, organize, and manage questions.</span>
          </div>
        </div>
      </div>
    )}
  </div>
)

export default SuccessStatus