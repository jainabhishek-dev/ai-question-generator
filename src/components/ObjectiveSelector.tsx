"use client";

import { useState } from "react";
import { LearningObjective } from "@/types/lessonPlan";
import { CheckCircleIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

interface Props {
  objectives: LearningObjective[];
  selectedObjective?: string;
  onObjectiveSelect: (objective: string) => void;
  totalFound?: number;
  filtered?: boolean;
}

export default function ObjectiveSelector({ 
  objectives, 
  selectedObjective, 
  onObjectiveSelect,
  totalFound,
  filtered 
}: Props) {
  const [hoveredObjective, setHoveredObjective] = useState<string | null>(null);

  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
          <AcademicCapIcon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Select Learning Objective
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the specific objective for your lesson plan
          </p>
        </div>
      </div>

      {/* Filtering Information */}
      {filtered && totalFound && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-700">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            📚 Showing {objectives.length} most relevant objectives from {totalFound} found in the chapter
          </p>
        </div>
      )}

      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.map((objective, index) => {
          const isSelected = selectedObjective === objective.text;
          const isHovered = hoveredObjective === objective.text;
          
          return (
            <button
              key={index}
              onClick={() => onObjectiveSelect(objective.text)}
              onMouseEnter={() => setHoveredObjective(objective.text)}
              onMouseLeave={() => setHoveredObjective(null)}
              className={`
                w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400' 
                  : isHovered
                    ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600'
                    : 'border-gray-200 bg-white dark:bg-gray-800/50 dark:border-gray-700'
                }
                hover:shadow-md
              `}
            >
              <div className="flex items-start space-x-3">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isSelected && (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      🎯 Objective {index + 1}
                    </span>
                    {objective.relevanceScore && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        Relevance: {Math.round(objective.relevanceScore * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                    {objective.text}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Status */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        {selectedObjective ? (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>Objective selected. Continue to next step.</span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            👆 Select an objective to continue with lesson plan creation
          </div>
        )}
      </div>

      {/* No Objectives State */}
      {objectives.length === 0 && (
        <div className="text-center py-8">
          <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Learning Objectives Found
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            The AI couldn&apos;t extract learning objectives from the uploaded content. 
            You can still create a lesson plan using the subject and grade information.
          </p>
        </div>
      )}
    </div>
  );
}