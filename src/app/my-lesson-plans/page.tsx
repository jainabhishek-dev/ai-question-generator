"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LessonPlanDisplay from "@/components/LessonPlanDisplay";
import AuthModal from "@/components/AuthModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LessonPlan, LessonPlanRecord } from "@/types/lessonPlan";
import { getUserLessonPlans, softDeleteLessonPlan, recordToLessonPlan } from "@/lib/lessonPlanDatabase";
import Link from "next/link";
import { 
  BookOpenIcon, 
  TrashIcon, 
  PencilIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";

interface FilterOptions {
  subject: string;
  grade: string;
  duration: string;
  sortBy: 'newest' | 'oldest' | 'subject' | 'grade';
}

export default function MyLessonPlansPage() {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlanRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    subject: 'all',
    grade: 'all',
    duration: 'all',
    sortBy: 'newest'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    planId: number | null;
    planTitle: string;
  }>({ isOpen: false, planId: null, planTitle: '' });
  const [exportingIds, setExportingIds] = useState<Set<number>>(new Set());
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());

  // Cache key for localStorage
  const CACHE_KEY = 'lesson_plans_cache';
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  // Filter and sort lesson plans
  useEffect(() => {
    let filtered = [...lessonPlans];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.subject.toLowerCase().includes(term) ||
        plan.learning_objective?.toLowerCase().includes(term) ||
        plan.grade.toLowerCase().includes(term)
      );
    }

    // Subject filter
    if (filters.subject !== 'all') {
      filtered = filtered.filter(plan => plan.subject === filters.subject);
    }

    // Grade filter
    if (filters.grade !== 'all') {
      filtered = filtered.filter(plan => plan.grade === filters.grade);
    }

    // Duration filter
    if (filters.duration !== 'all') {
      filtered = filtered.filter(plan => plan.duration_minutes === parseInt(filters.duration));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'oldest':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'grade':
          return a.grade.localeCompare(b.grade);
        default:
          return 0;
      }
    });

    // This will be replaced by memoized version below
  }, [lessonPlans, searchTerm, filters]);

  // Memoize filtered and sorted lesson plans for better performance  
  const filteredPlans = useMemo(() => {
    let filtered = [...lessonPlans];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.subject.toLowerCase().includes(term) ||
        plan.learning_objective?.toLowerCase().includes(term) ||
        plan.grade.toLowerCase().includes(term)
      );
    }

    // Subject filter
    if (filters.subject !== 'all') {
      filtered = filtered.filter(plan => plan.subject === filters.subject);
    }

    // Grade filter
    if (filters.grade !== 'all') {
      filtered = filtered.filter(plan => plan.grade === filters.grade);
    }

    // Duration filter
    if (filters.duration !== 'all') {
      filtered = filtered.filter(plan => plan.duration_minutes === parseInt(filters.duration));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'oldest':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'grade':
          return a.grade.localeCompare(b.grade);
        default:
          return 0;
      }
    });

    return filtered;
  }, [lessonPlans, searchTerm, filters]);

  const loadLessonPlans = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = localStorage.getItem(`${CACHE_KEY}_${user.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS;
          
          if (!isExpired && Array.isArray(data)) {
            setLessonPlans(data);
            setLoading(false);
            return;
          }
        }
      }
      
      // Fetch from API
      const result = await getUserLessonPlans(user.id);
      
      if (result.success && result.data) {
        setLessonPlans(result.data);
        
        // Cache the result
        localStorage.setItem(`${CACHE_KEY}_${user.id}`, JSON.stringify({
          data: result.data,
          timestamp: Date.now()
        }));
      } else {
        setError(result.error || 'Failed to load lesson plans');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }, [user?.id, CACHE_EXPIRY_MS]);

  // Load lesson plans from cache or API
  useEffect(() => {
    if (user) {
      loadLessonPlans();
    } else {
      setLoading(false);
      setShowAuthModal(true);
    }
  }, [user, loadLessonPlans]);

  const handleDeletePlan = async (planId: number) => {
    if (!user?.id) return;

    try {
      const result = await softDeleteLessonPlan(planId, user.id);
      
      if (result.success) {
        const updatedPlans = lessonPlans.filter(plan => plan.id !== planId);
        setLessonPlans(updatedPlans);
        setDeleteConfirm({ isOpen: false, planId: null, planTitle: '' });
        
        // Update cache
        localStorage.setItem(`${CACHE_KEY}_${user.id}`, JSON.stringify({
          data: updatedPlans,
          timestamp: Date.now()
        }));
      } else {
        alert(result.error || 'Failed to delete lesson plan');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete lesson plan');
    }
  };

  const openDeleteConfirm = useCallback((planId: number, planTitle: string) => {
    setDeleteConfirm({ isOpen: true, planId, planTitle });
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ isOpen: false, planId: null, planTitle: '' });
  }, []);

  const togglePlanExpansion = useCallback((planId: number) => {
    setExpandedPlans(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(planId)) {
        newExpanded.delete(planId);
      } else {
        newExpanded.add(planId);
      }
      return newExpanded;
    });
  }, []);

  const handleExportPdf = async (planRecord: LessonPlanRecord) => {
    try {
      setExportingIds(prev => new Set([...prev, planRecord.id!]));
      
      // Convert record to LessonPlan format
      const lessonPlan = {
        id: planRecord.id,
        subject: planRecord.subject,
        grade: planRecord.grade,
        chapterName: planRecord.chapter_name,
        learningObjective: planRecord.learning_objective,
        learnerLevel: planRecord.learner_level,
        durationMinutes: planRecord.duration_minutes,
        sections: planRecord.sections as LessonPlan['sections'],
        additionalNotes: planRecord.additional_notes,
        extractedObjectives: planRecord.extracted_objectives,
      };

      const response = await fetch('/api/lesson-plans/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonPlan,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'lesson_plan.pdf';

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export PDF');
    } finally {
      setExportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(planRecord.id!);
        return newSet;
      });
    }
  };

  // Memoize unique values for filters to prevent recalculation on every render
  const uniqueSubjects = useMemo(() => 
    [...new Set(lessonPlans.map(plan => plan.subject))].sort()
  , [lessonPlans]);
  
  const uniqueGrades = useMemo(() => 
    [...new Set(lessonPlans.map(plan => plan.grade))].sort()
  , [lessonPlans]);

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-3xl shadow-2xl p-8 dark:bg-gray-900/80 dark:border-gray-700/50">
            <BookOpenIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Sign In Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Please sign in to view and manage your saved lesson plans.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-400 dark:to-purple-400">
            My Lesson Plans
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 max-w-2xl mx-auto dark:text-gray-300">
            Manage your saved lesson plans, search by topic, and organize your teaching resources
          </p>
          
          {/* Create New Plan Button */}
          <Link
            href="/lesson-plans"
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium py-2 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create New Lesson Plan</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl shadow-lg px-4 py-4 dark:bg-gray-900/80 dark:border-gray-700/50">
          {/* Search Bar */}
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search lesson plans by title, subject, topic, or grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade
              </label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Grades</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Duration Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration
              </label>
              <select
                value={filters.duration}
                onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">Any Duration</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as FilterOptions['sortBy'] }))}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="subject">Subject A-Z</option>
                <option value="grade">Grade Level</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {filteredPlans.length} of {lessonPlans.length} lesson plans
            </span>
            {(searchTerm || filters.subject !== 'all' || filters.grade !== 'all' || filters.duration !== 'all') && (
              <div className="flex space-x-3">
                <button
                  onClick={() => loadLessonPlans(true)}
                  className="text-green-600 hover:text-green-800 font-medium dark:text-green-400"
                  title="Refresh lesson plans"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ subject: 'all', grade: 'all', duration: 'all', sortBy: 'newest' });
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <LoadingSpinner />
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading your lesson plans...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl shadow-lg dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            {lessonPlans.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No Lesson Plans Yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Create your first AI-generated lesson plan to get started.
                </p>
                <Link
                  href="/lesson-plans"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-xl transition-colors"
                >
                  Create Your First Lesson Plan
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No Results Found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search terms or filters.
                </p>
              </>
            )}
          </div>
        )}

        {/* Lesson Plans Grid */}
        {!loading && !error && filteredPlans.length > 0 && (
          <div className="space-y-8">
            {filteredPlans.map((planRecord) => (
              <div
                key={planRecord.id}
                className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl shadow-lg overflow-hidden dark:bg-gray-900/80 dark:border-gray-700/50"
              >
                {/* Enhanced Card Header */}
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Learning Objective as Main Title */}
                      <div>
                        <h3 className="text-base font-semibold text-blue-600 dark:text-blue-400 leading-snug">
                          🎯 {planRecord.learning_objective}
                        </h3>
                      </div>
                      
                      {/* Comprehensive Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                        {/* Subject & Grade */}
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                          <BookOpenIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{planRecord.subject}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">
                          <AdjustmentsHorizontalIcon className="w-3 h-3" />
                          <span className="font-medium">{planRecord.grade}</span>
                        </div>
                        
                        {/* Chapter Name */}
                        {planRecord.chapter_name && (
                          <div className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md col-span-2 sm:col-span-1">
                            <BookOpenIcon className="w-3 h-3" />
                            <span className="font-medium truncate">{planRecord.chapter_name}</span>
                          </div>
                        )}
                        
                        {/* Duration */}
                        <div className="flex items-center space-x-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-md">
                          <ClockIcon className="w-3 h-3" />
                          <span className="font-medium">{planRecord.duration_minutes} min</span>
                        </div>
                        
                        {/* Created Date */}
                        <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-md">
                          <CalendarIcon className="w-3 h-3" />
                          <span className="font-medium">{new Date(planRecord.created_at || '').toLocaleDateString()}</span>
                        </div>
                        
                        {/* Level */}
                        <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">
                          <UserGroupIcon className="w-3 h-3" />
                          <span className="font-medium capitalize">{planRecord.learner_level}</span>
                        </div>
                        
                        {/* Section Count */}
                        <div className="flex items-center space-x-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-md">
                          <span className="text-xs font-bold">📚</span>
                          <span className="font-medium">{Object.keys(planRecord.sections || {}).length} sections</span>
                        </div>
                      </div>
                      
                      {/* Expand/Collapse Button */}
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => planRecord.id && togglePlanExpansion(planRecord.id)}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          {expandedPlans.has(planRecord.id!) ? (
                            <>
                              <ChevronUpIcon className="w-4 h-4" />
                              <span>Hide Lesson Plan</span>
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="w-4 h-4" />
                              <span>View Lesson Plan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Actions Menu */}
                    <div className="relative ml-4">
                      <button
                        onClick={() => {
                          // Toggle dropdown menu
                          const menuId = `menu-${planRecord.id}`;
                          const menu = document.getElementById(menuId);
                          if (menu) {
                            menu.classList.toggle('hidden');
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                        title="More options"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div
                        id={`menu-${planRecord.id}`}
                        className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 hidden"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleExportPdf(planRecord)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4 text-green-600" />
                            <span>Export as PDF</span>
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                            <span>Edit Lesson Plan</span>
                          </button>
                          <hr className="border-gray-200 dark:border-gray-600" />
                          <button
                            onClick={() => planRecord.id && openDeleteConfirm(planRecord.id, planRecord.learning_objective)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>Delete Lesson Plan</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Plan Display */}
                {expandedPlans.has(planRecord.id!) && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <ErrorBoundary>
                      <LessonPlanDisplay
                        lessonPlan={recordToLessonPlan(planRecord)}
                        showActions={false}
                        isEditable={false}
                      />
                    </ErrorBoundary>
                    {exportingIds.has(planRecord.id!) && (
                      <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600"></div>
                        <span>Exporting PDF...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Lesson Plan
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete &ldquo;{deleteConfirm.planTitle}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteConfirm.planId && handleDeletePlan(deleteConfirm.planId)}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  disabled={!deleteConfirm.planId}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex justify-center space-x-6 pt-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Back to Home
          </Link>
          <Link
            href="/lesson-plans"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors dark:text-blue-400 dark:hover:text-blue-200"
          >
            Create New Plan →
          </Link>
        </div>
      </div>
    </main>
  );
}