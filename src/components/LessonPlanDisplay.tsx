"use client";

import { useState, memo, useMemo, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { LessonPlan, LESSON_PLAN_SECTIONS } from "@/types/lessonPlan";
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  BookmarkIcon,
  DocumentArrowDownIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

interface Props {
  lessonPlan: LessonPlan;
  onSave?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  showActions?: boolean;
}

// Fixed section order constant
const SECTION_ORDER = [
  'teacherPreparation',
  'iDo', 
  'weDo',
  'youDo',
  'conclusion',
  'homework'
] as const;

const LessonPlanDisplay = memo(function LessonPlanDisplay({ 
  lessonPlan, 
  onSave, 
  onEdit, 
  onExport,
  onDelete,
  isEditable = true,
  showActions = true 
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      return newExpanded;
    });
  }, []);

  // Memoize sections array to prevent recalculation on every render
  const sectionsArray = useMemo(() => {
    const SECTION_ORDER = ['teacherPreparation', 'iDo', 'weDo', 'youDo', 'conclusion', 'homework'] as const;
    
    return SECTION_ORDER
      .map(key => {
        const sectionData = lessonPlan.sections[key as keyof typeof lessonPlan.sections];
        if (sectionData) {
          return {
            key,
            // Always use the consistent display title from constants
            title: LESSON_PLAN_SECTIONS[key as keyof typeof LESSON_PLAN_SECTIONS],
            content: sectionData.content,
            timeAllocation: sectionData.timeAllocation
          };
        }
        return null;
      })
      .filter((section): section is NonNullable<typeof section> => section !== null);
  }, [lessonPlan]);

  const toggleAllSections = () => {
    if (isExpanded) {
      setExpandedSections(new Set());
      setIsExpanded(false);
    } else {
      const allSections = new Set(SECTION_ORDER.filter(key => lessonPlan.sections[key]));
      setExpandedSections(allSections);
      setIsExpanded(true);
    }
  };

  const getSectionIcon = (sectionKey: string) => {
    const icons: Record<string, string> = {
      teacherPreparation: '🎯',
      iDo: '👨‍🏫',
      weDo: '👥',
      youDo: '🎓',
      conclusion: '🏁',
      homework: '📝'
    };
    return icons[sectionKey] || '📖';
  };

  const formatTimeAllocation = (minutes?: number) => {
    if (!minutes) return '';
    return `${minutes} min`;
  };

  return (
    <div className="space-y-4">
      {/* Sections Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📚 Lesson Plan Sections
        </h3>
        <button
          onClick={toggleAllSections}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors dark:text-blue-400 dark:hover:text-blue-200"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span>{isExpanded ? 'Collapse All' : 'Expand All'} Sections</span>
        </button>
      </div>

      {/* Lesson Plan Sections */}
      <div className="space-y-3">
        {sectionsArray.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          
          return (
            <div
              key={section.key}
              className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-lg overflow-hidden dark:bg-gray-900/70 dark:border-gray-700/20"
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getSectionIcon(section.key)}</span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                      {section.title}
                    </h3>
                    {section.timeAllocation && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ⏱️ {formatTimeAllocation(section.timeAllocation)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {section.timeAllocation && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                      {formatTimeAllocation(section.timeAllocation)}
                    </span>
                  )}
                  <ChevronDownIcon 
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isExpanded ? 'rotate-180' : 'rotate-0'
                    }`} 
                  />
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
                    <div className="prose max-w-none sm:prose-lg dark:prose-invert text-gray-700 dark:text-gray-300">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Notes */}
      {lessonPlan.additionalNotes && (
        <div className="backdrop-blur-xl bg-amber-50/80 border border-amber-200/50 rounded-2xl shadow-lg px-4 py-3 dark:bg-amber-900/20 dark:border-amber-700/50">
          <h4 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center">
            <span className="text-lg mr-2">📝</span>
            Additional Notes
          </h4>
          <div className="prose max-w-none text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
              rehypePlugins={[rehypeKatex]}
            >
              {lessonPlan.additionalNotes}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {showActions && (
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-lg px-3 sm:px-4 py-3 dark:bg-gray-900/70 dark:border-gray-700/20">
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            {onSave && (
              <button
                onClick={onSave}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-1 sm:space-x-2"
              >
                <BookmarkIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Save Lesson Plan</span>
                <span className="sm:hidden">Save</span>
              </button>
            )}
            
            {onExport && (
              <button
                onClick={onExport}
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-1 sm:space-x-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export as PDF</span>
                <span className="sm:hidden">Export</span>
              </button>
            )}
            
            {isEditable && onEdit && (
              <button
                onClick={onEdit}
                className="bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-1 sm:space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Lesson Plan</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-1 sm:space-x-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Lesson Plan</span>
                <span className="sm:hidden">Delete</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default LessonPlanDisplay;