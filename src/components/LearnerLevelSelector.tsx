"use client";

import { LEARNER_LEVEL_OPTIONS } from "@/types/lessonPlan";
import { UserGroupIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  selectedLevel?: 'beginner' | 'intermediate' | 'advanced';
  onLevelSelect: (level: 'beginner' | 'intermediate' | 'advanced') => void;
}

export default function LearnerLevelSelector({ selectedLevel, onLevelSelect }: Props) {
  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-3">
          <UserGroupIcon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Select Learner Level
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the proficiency level of your students for this objective
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {LEARNER_LEVEL_OPTIONS.map((option) => {
          const isSelected = selectedLevel === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onLevelSelect(option.value)}
              className={`
                w-full text-left p-6 rounded-xl border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-800'
                }
                hover:shadow-md
              `}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Indicator */}
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isSelected && (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Level Icon */}
                <div className="text-3xl flex-shrink-0 mt-1">
                  {option.icon}
                </div>
                
                {/* Level Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {option.label}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {option.description}
                  </p>
                  
                  {/* Level-specific features */}
                  <div className="space-y-1">
                    {option.value === 'beginner' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="block">• Simple, step-by-step instructions</span>
                        <span className="block">• More scaffolding and support</span>
                        <span className="block">• Concrete examples and visual aids</span>
                      </div>
                    )}
                    {option.value === 'intermediate' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="block">• Moderate challenges and practice</span>
                        <span className="block">• Balanced guided and independent work</span>
                        <span className="block">• Connecting to prior knowledge</span>
                      </div>
                    )}
                    {option.value === 'advanced' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="block">• Complex, thought-provoking activities</span>
                        <span className="block">• Critical thinking and analysis</span>
                        <span className="block">• Real-world applications and extensions</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Status */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        {selectedLevel ? (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>
              Learner level selected: <strong>{LEARNER_LEVEL_OPTIONS.find(o => o.value === selectedLevel)?.label}</strong>
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            👆 Select a learner level to continue with lesson plan creation
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800/50">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          💡 Choosing the Right Level:
        </h5>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>Beginner:</strong> Students are new to this concept or topic</li>
          <li>• <strong>Intermediate:</strong> Students have some background knowledge</li>
          <li>• <strong>Advanced:</strong> Students have a strong foundation and are ready for complex applications</li>
        </ul>
      </div>
    </div>
  );
}