"use client";

import { useState } from "react";
import LessonPlanForm from "./LessonPlanForm";
import ObjectiveSelector from "./ObjectiveSelector";
import LearnerLevelSelector from "./LearnerLevelSelector";
import DurationSelector from "./DurationSelector";
import { LessonPlan, LessonPlanState, LearningObjective, LessonPlanFormData } from "@/types/lessonPlan";
import { ChevronLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { extractLearningObjectives, generateLessonPlan } from "@/lib/gemini";
import { validateObjectivesResponse, validateLessonPlanResponse } from "@/lib/lessonPlanPrompt";

interface Props {
  onLessonPlanGenerated?: (lessonPlan: LessonPlan) => void;
}

export default function LessonPlanWizard({ onLessonPlanGenerated }: Props) {
  const [state, setState] = useState<LessonPlanState>({
    formData: {
      subject: "",
      grade: "Grade 6",
      chapterName: "",
      sections: [],
      additionalNotes: ""
    },
    extractedObjectives: [],
    currentStep: 'form',
    loading: false
  });

  const setLoading = (loading: boolean, error?: string) => {
    setState(prev => ({ ...prev, loading, error }));
  };

  const setError = (error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  };

  const goToStep = (step: LessonPlanState['currentStep']) => {
    setState(prev => ({ ...prev, currentStep: step, error: undefined }));
  };

  const handleFormSubmit = async (formData: LessonPlanFormData) => {
    setLoading(true);
    setState(prev => ({ ...prev, formData, currentStep: 'generating' }));

    try {
      // Step 1: Extract objectives from PDF file if available
      if (formData.pdfFile) {
        console.log(`📚 Extracting objectives from PDF: ${formData.pdfFile.name} for ${formData.subject} - ${formData.grade}`);
        
        // Call function directly instead of API route
        const aiResponse = await extractLearningObjectives(
          formData.pdfFile,
          formData.subject,
          formData.grade
        );

        // Validate AI response
        const validation = validateObjectivesResponse(aiResponse);
        if (!validation.valid || !validation.data) {
          throw new Error(validation.error || 'Failed to extract valid learning objectives from the content');
        }

        const { objectives } = validation.data;
        const learningObjectives: LearningObjective[] = objectives.map(text => ({ text }));

        setState(prev => ({
          ...prev,
          extractedObjectives: learningObjectives,
          currentStep: 'objectives',
          loading: false
        }));
      } else {
        // No PDF content - skip to learner level selection with a general objective
        const generalObjective = `Master key concepts in ${formData.subject} for ${formData.grade} level`;
        setState(prev => ({
          ...prev,
          extractedObjectives: [{ text: generalObjective }],
          selectedObjective: generalObjective,
          currentStep: 'level',
          loading: false
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleObjectiveSelect = (objective: string) => {
    setState(prev => ({
      ...prev,
      selectedObjective: objective,
      currentStep: 'level'
    }));
  };

  const handleLevelSelect = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setState(prev => ({
      ...prev,
      learnerLevel: level,
      currentStep: 'duration'
    }));
  };

  const handleDurationSelect = (duration: 30 | 45 | 60) => {
    setState(prev => ({
      ...prev,
      duration
    }));
  };

  const handleFinalGeneration = async () => {
    if (!state.selectedObjective || !state.learnerLevel || !state.duration) {
      setError('Please complete all selection steps');
      return;
    }

    setLoading(true);
    setState(prev => ({ ...prev, currentStep: 'generating' }));

    try {
      console.log(`🏗️ Generating ${state.duration}-minute ${state.formData.subject} lesson plan`);
      
      // Call function directly instead of API route
      const aiResponse = await generateLessonPlan(
        state.formData,
        state.selectedObjective!,
        state.learnerLevel!,
        state.duration!
      );

      // Validate AI response
      const validation = validateLessonPlanResponse(aiResponse, state.duration);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.error || 'Failed to generate valid lesson plan');
      }

      // Show duration warning if present
      if (validation.warning) {
        console.warn(validation.warning);
      }

      // Create complete lesson plan object
      const lessonPlan = {
        subject: state.formData.subject,
        grade: state.formData.grade,
        chapterName: state.formData.chapterName,
        learningObjective: state.selectedObjective!,
        learnerLevel: state.learnerLevel!,
        durationMinutes: state.duration!,
        sections: validation.data.sections,
        additionalNotes: state.formData.additionalNotes,
        extractedObjectives: state.extractedObjectives.map(obj => obj.text)
      };

      setState(prev => ({
        ...prev,
        generatedPlan: lessonPlan,
        currentStep: 'complete',
        loading: false
      }));
      onLessonPlanGenerated?.(lessonPlan);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleStartOver = () => {
    setState({
      formData: {
        subject: "",
        grade: "Grade 6",
        chapterName: "",
        sections: [],
        additionalNotes: ""
      },
      extractedObjectives: [],
      currentStep: 'form',
      loading: false
    });
  };

  // Progress indicator
  const getStepNumber = () => {
    const hasPdfFile = !!state.formData.pdfFile;
    
    switch (state.currentStep) {
      case 'form': return 1;
      case 'objectives': return 2;
      case 'level': return hasPdfFile ? 3 : 2;
      case 'duration': return hasPdfFile ? 4 : 3;
      case 'generating': return hasPdfFile ? 5 : 4;
      case 'complete': return hasPdfFile ? 5 : 4;
      default: return 1;
    }
  };

  const getTotalSteps = () => {
    return state.formData.pdfFile ? 5 : 4; // Skip objectives step if no PDF
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-4 dark:bg-gray-900/70 dark:border-gray-700/20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Lesson Plan Creation
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {getStepNumber()} of {getTotalSteps()}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(getStepNumber() / getTotalSteps()) * 100}%` }}
          />
        </div>
        
        {/* Step Circles */}
        <div className="flex items-center justify-between mt-3">
          {Array.from({ length: getTotalSteps() }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === getStepNumber();
            const isCompleted = stepNumber < getStepNumber();
            
            return (
              <div key={stepNumber} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                      ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-800' 
                      : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {isCompleted ? '✓' : stepNumber}
                </div>
                <div className={`mt-1 text-xs text-center ${
                  isActive ? 'text-blue-600 font-medium dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {getTotalSteps() === 4 ? (
                    // No PDF workflow
                    stepNumber === 1 ? 'Form' :
                    stepNumber === 2 ? 'Level' :
                    stepNumber === 3 ? 'Duration' :
                    'Complete'
                  ) : (
                    // PDF workflow
                    stepNumber === 1 ? 'Form' :
                    stepNumber === 2 ? 'Objectives' :
                    stepNumber === 3 ? 'Level' :
                    stepNumber === 4 ? 'Duration' :
                    'Complete'
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {state.currentStep === 'form' && 'Basic lesson information'}
          {state.currentStep === 'objectives' && 'Learning objectives selection'}
          {state.currentStep === 'level' && 'Learner proficiency level'}
          {state.currentStep === 'duration' && 'Lesson duration'}
          {state.currentStep === 'generating' && 'Generating your lesson plan...'}
          {state.currentStep === 'complete' && 'Lesson plan ready!'}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl shadow-lg dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
          <div className="flex items-center space-x-3">
            <span className="font-medium">Error: {state.error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      {state.currentStep === 'form' && (
        <LessonPlanForm
          onSubmit={handleFormSubmit}
          isLoading={state.loading}
        />
      )}

      {state.currentStep === 'objectives' && (
        <>
          <ObjectiveSelector
            objectives={state.extractedObjectives}
            selectedObjective={state.selectedObjective}
            onObjectiveSelect={handleObjectiveSelect}
            totalFound={state.extractedObjectives.length}
            filtered={false}
          />
          
          {/* Back Button */}
          <div className="flex justify-between">
            <button
              onClick={() => goToStep('form')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Back to Form
            </button>
          </div>
        </>
      )}

      {state.currentStep === 'level' && (
        <>
          <LearnerLevelSelector
            selectedLevel={state.learnerLevel}
            onLevelSelect={handleLevelSelect}
          />
          
          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => goToStep(state.formData.pdfFile ? 'objectives' : 'form')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
        </>
      )}

      {state.currentStep === 'duration' && (
        <>
          <DurationSelector
            selectedDuration={state.duration}
            onDurationSelect={handleDurationSelect}
          />
          
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => goToStep('level')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Back to Level
            </button>
            
            {state.duration && (
              <button
                onClick={handleFinalGeneration}
                disabled={state.loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.loading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="animate-spin h-5 w-5" />
                    <span>Creating Lesson Plan...</span>
                  </div>
                ) : (
                  'Create Lesson Plan ✨'
                )}
              </button>
            )}
          </div>
        </>
      )}

      {state.currentStep === 'generating' && (
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-12 text-center dark:bg-gray-900/70 dark:border-gray-700/20">
          <ArrowPathIcon className="animate-spin h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Creating Your Lesson Plan
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Our AI is crafting a personalized {state.duration}-minute lesson plan for {state.learnerLevel} level students...
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            This usually takes 30-60 seconds
          </div>
        </div>
      )}

      {state.currentStep === 'complete' && (
        <div className="backdrop-blur-xl bg-green-50/80 border border-green-200/50 rounded-2xl shadow-xl p-8 text-center dark:bg-green-900/20 dark:border-green-700">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
            Lesson Plan Created Successfully!
          </h3>
          <p className="text-green-600 dark:text-green-400 mb-6">
            Your personalized lesson plan is ready. You can view, edit, and save it below.
          </p>
          <button
            onClick={handleStartOver}
            className="bg-white text-green-600 border border-green-300 hover:bg-green-50 font-medium py-2 px-6 rounded-lg transition-colors dark:bg-gray-800 dark:text-green-400 dark:border-green-600 dark:hover:bg-gray-700"
          >
            Create Another Lesson Plan
          </button>
        </div>
      )}
    </div>
  );
}