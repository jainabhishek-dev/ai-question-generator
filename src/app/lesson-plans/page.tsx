"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LessonPlanWizard from "@/components/LessonPlanWizard";
import LessonPlanDisplay from "@/components/LessonPlanDisplay";
import AuthModal from "@/components/AuthModal";
import { LessonPlan } from "@/types/lessonPlan";
import { saveLessonPlan } from "@/lib/lessonPlanDatabase";
import Link from "next/link";
import { 
  ExclamationCircleIcon, 
  BookOpenIcon, 
  ArrowLeftIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";

export default function LessonPlansPage() {
  const { user } = useAuth();
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showNewPlanButton, setShowNewPlanButton] = useState(false);

  const handleLessonPlanGenerated = (lessonPlan: LessonPlan) => {
    setGeneratedPlan(lessonPlan);
    setShowNewPlanButton(true);
    
    // Auto-save for authenticated users
    if (user && user.id) {
      handleSavePlan(lessonPlan);
    }
  };

  const handleSavePlan = async (lessonPlan?: LessonPlan) => {
    const planToSave = lessonPlan || generatedPlan;
    if (!planToSave) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    try {
      const result = await saveLessonPlan(planToSave, user.id);
      
      if (result.success) {
        setSaveStatus('saved');
        // Update the generated plan with the saved ID
        if (result.data?.id) {
          setGeneratedPlan(prev => prev ? { ...prev, id: result.data!.id } : null);
        }
      } else {
        setSaveStatus('error');
        setSaveError(result.error || 'Failed to save lesson plan');
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save lesson plan');
    }
  };

  const handleExportPlan = () => {
    if (!generatedPlan) return;
    
    // TODO: Implement PDF export functionality
    // This would be similar to the question export feature
    alert('PDF export will be implemented in the next phase. For now, you can copy the content manually.');
  };

  const handleCreateNewPlan = () => {
    setGeneratedPlan(null);
    setShowNewPlanButton(false);
    setSaveStatus('idle');
    setSaveError(null);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-400 dark:to-purple-400">
            AI Lesson Plan Generator
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto dark:text-gray-300">
            Create comprehensive, curriculum-aligned lesson plans in minutes with our intelligent AI assistant
          </p>
        </div>

        {/* User Info Bar */}
        {user && (
          <div className="backdrop-blur-xl bg-blue-50/80 border border-blue-200/50 rounded-2xl shadow-lg p-4 dark:bg-blue-900/20 dark:border-blue-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Welcome back, {user.email}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Create unlimited lesson plans
                  </p>
                </div>
              </div>
              <Link 
                href="/my-lesson-plans"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm dark:text-blue-400 dark:hover:text-blue-200"
              >
                View My Plans →
              </Link>
            </div>
          </div>
        )}

        {/* Save Status */}
        {saveStatus === 'saved' && (
          <div className="backdrop-blur-xl bg-green-50/80 border border-green-200/50 text-green-700 px-6 py-4 rounded-2xl shadow-lg dark:bg-green-900/20 dark:border-green-700 dark:text-green-300">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="font-medium">Lesson plan saved successfully to your library!</span>
            </div>
          </div>
        )}

        {/* Save Error */}
        {saveError && (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl shadow-lg dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="font-medium">Failed to save lesson plan</span>
                <p className="text-sm mt-1">{saveError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!generatedPlan ? (
          <LessonPlanWizard onLessonPlanGenerated={handleLessonPlanGenerated} />
        ) : (
          <>
            {/* New Plan Button */}
            {showNewPlanButton && (
              <div className="text-center">
                <button
                  onClick={handleCreateNewPlan}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  ✨ Create New Lesson Plan
                </button>
              </div>
            )}

            {/* Generated Lesson Plan Display */}
            <LessonPlanDisplay
              lessonPlan={generatedPlan}
              onSave={user ? () => handleSavePlan() : () => setShowAuthModal(true)}
              onExport={handleExportPlan}
              showActions={true}
            />
          </>
        )}

        {/* Call-to-Action for Non-Authenticated Users */}
        {!user && !generatedPlan && (
          <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-2xl shadow-lg p-6 text-center dark:from-blue-900/20 dark:to-purple-900/20 dark:border-blue-700/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Save Your Lesson Plans
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sign in to save your generated lesson plans, create a personal library, and access them anytime.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Sign In to Save Plans
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex justify-center space-x-6 pt-8">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors space-x-2 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          
          {user && (
            <Link
              href="/my-lesson-plans"
              className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors space-x-2 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <BookOpenIcon className="w-4 h-4" />
              <span>My Lesson Plans</span>
            </Link>
          )}
        </div>

        {/* Authentication Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </main>
  );
}