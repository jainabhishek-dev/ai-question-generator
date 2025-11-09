"use client";

import { DURATION_OPTIONS } from "@/types/lessonPlan";
import { ClockIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  selectedDuration?: 30 | 45 | 60;
  onDurationSelect: (duration: 30 | 45 | 60) => void;
}

export default function DurationSelector({ selectedDuration, onDurationSelect }: Props) {
  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-3">
          <ClockIcon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Select Lesson Duration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the time available for this lesson
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = selectedDuration === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onDurationSelect(option.value)}
              className={`
                text-left p-6 rounded-xl border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-800'
                }
                hover:shadow-md
              `}
            >
              <div className="text-center">
                {/* Selection Indicator */}
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto mb-3
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isSelected && (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Duration Display */}
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  ⏱️ {option.value}
                </div>
                
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {option.label}
                </h4>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {option.description}
                </p>
                
                {/* Features List */}
                <div className="space-y-1">
                  {option.features.map((feature, index) => (
                    <div key={index} className="text-xs text-gray-500 dark:text-gray-400 flex items-start">
                      <span className="text-green-500 mr-1 flex-shrink-0">•</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Status */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        {selectedDuration ? (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>
              Duration selected: <strong>{selectedDuration} minutes</strong>
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            👆 Select a lesson duration to continue with lesson plan creation
          </div>
        )}
      </div>

      {/* Dynamic Time Allocation Info */}
      {selectedDuration && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800/50">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ⏰ Time Allocation for {selectedDuration} minutes:
          </h5>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>• <strong>Teacher Preparation:</strong> 0 minutes (pre-class setup)</div>
            <div>• <strong>Lesson Sections:</strong> Flexible allocation totaling exactly {selectedDuration} minutes</div>
            <div>• <strong>AI Decision:</strong> Time distributed based on content complexity and learning needs</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ✨ Each lesson plan will have custom time allocation optimized for the specific learning objective
          </p>
        </div>
      )}
    </div>
  );
}