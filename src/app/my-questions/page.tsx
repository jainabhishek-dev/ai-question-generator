'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import Link from 'next/link'
import { QuestionRecord } from '@/types/question'
import { getUserQuestions, softDeleteUserQuestion } from '@/lib/database'

export default function MyQuestionsPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states (actual applied)
  const [typeFilter, setTypeFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [bloomsFilter, setBloomsFilter] = useState('')
  
  // Local filter states for dropdowns
  const [typeDraft, setTypeDraft] = useState('')
  const [gradeDraft, setGradeDraft] = useState('')
  const [difficultyDraft, setDifficultyDraft] = useState('')
  const [bloomsDraft, setBloomsDraft] = useState('')
  
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  
  // Selection state for checkboxes
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Filtering logic
  const filteredQuestions = questions.filter(q => {
    return (
      (!typeFilter || q.question_type === typeFilter) &&
      (!gradeFilter || q.grade === gradeFilter) &&
      (!difficultyFilter || q.difficulty === difficultyFilter) &&
      (!bloomsFilter || q.blooms_level === bloomsFilter)
    )
  })

  // Whether all filtered questions are selected
  const isAllSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => q.id && selectedIds.includes(q.id))

  // Toggle select all
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id!).filter(Boolean))
    }
  }

  // Toggle individual selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getUserQuestions(user.id, { limit: 50 })
      .then(res => {
        if (res.success && res.data) {
          setQuestions(res.data)
        } else {
          setError(res.error || 'Failed to fetch questions.')
        }
      })
      .catch(err => {
        setError(err.message || 'Unknown error')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [user])

  // Example options - replace with your actual options or import from constants
  const typeOptions = ['multiple-choice', 'fill-in-the-blank', 'short-answer', 'long-answer']
  const gradeOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const difficultyOptions = ['easy', 'medium', 'hard']
  const bloomsOptions = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

  // Delete question handler
  async function handleDelete(questionId: number) {
    if (!user || !questionId) return

    setDeletingId(questionId)
    setError(null)

    try {
      const res = await softDeleteUserQuestion(questionId, user.id)
      if (!res.success) {
        setError(res.error || 'Failed to delete question.')
      } else {
        setQuestions(prev => prev.filter((q: QuestionRecord) => q.id !== questionId))
        setSelectedIds(prev => prev.filter(id => id !== questionId))
        setShowDeleteModal(false)
        setPendingDeleteId(null)
      }
    } catch (err: unknown) {
      const errorMessage = typeof err === 'object' && err !== null && 'message' in err
        ? (err as { message?: string }).message
        : undefined;
      setError(`Failed to delete question: ${errorMessage || 'Unknown error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Export as Worksheet (questions only)
  async function handleExportWorksheet(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
  event.preventDefault();
  setError(null);

  if (selectedIds.length === 0) {
    setError('No questions selected to export.');
    return;
  }

  try {
    const accessToken = user?.accessToken;
    if (!accessToken) {
      setError('Could not get user access token. Please log in again.');
      return;
    }

    const res = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedIds,
        userId: user?.id,
        exportType: 'worksheet',
        preferences: {
          formatting: {
            fontSize: 14,
            showHeaders: true,
            showFooters: true,
          },
        },
        accessToken,
      }),
    });

    if (!res.ok) {
      // Try to parse error response as JSON
      let errMsg = 'Failed to export PDF';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        // If not JSON, keep default
      }
      setError(errMsg);
      return;
    }

    // Validate content type
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/pdf')) {
      setError('Invalid response format - expected PDF');
      return;
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      setError('Received empty PDF file');
      return;
    }

    try {
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'worksheet.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download PDF file');
    }
  } catch (err: unknown) {
    const errorMessage = typeof err === 'object' && err !== null && 'message' in err
      ? (err as { message?: string }).message
      : undefined;
    setError(`Failed to export Worksheet: ${errorMessage || 'Unknown error'}`);
  }
}

  // Export as Answer Key (questions + answers)
  async function handleExportAnswerKey(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
  event.preventDefault();
  setError(null);

  if (selectedIds.length === 0) {
    setError('No questions selected to export.');
    return;
  }

  try {
    const accessToken = user?.accessToken;
    if (!accessToken) {
      setError('Could not get user access token. Please log in again.');
      return;
    }

    const res = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedIds,
        userId: user?.id,
        exportType: 'answer-key',
        preferences: {
          formatting: {
            fontSize: 14,
            showHeaders: true,
            showFooters: true,
          },
        },
        accessToken,
      }),
    });

    if (!res.ok) {
      let errMsg = 'Failed to export PDF';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        // If not JSON, keep default
      }
      setError(errMsg);
      return;
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/pdf')) {
      setError('Invalid response format - expected PDF');
      return;
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      setError('Received empty PDF file');
      return;
    }

    try {
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'answer-key.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download PDF file');
    }
  } catch (err: unknown) {
    const errorMessage = typeof err === 'object' && err !== null && 'message' in err
      ? (err as { message?: string }).message
      : undefined;
    setError(`Failed to export Answer Key: ${errorMessage || 'Unknown error'}`);
  }
}

  const applyFilters = () => {
    setTypeFilter(typeDraft)
    setGradeFilter(gradeDraft)
    setDifficultyFilter(difficultyDraft)
    setBloomsFilter(bloomsDraft)
  }

  const clearFilters = () => {
    setTypeDraft('')
    setGradeDraft('')
    setDifficultyDraft('')
    setBloomsDraft('')
    setTypeFilter('')
    setGradeFilter('')
    setDifficultyFilter('')
    setBloomsFilter('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            My Questions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage, filter, and export your educational content with ease
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Enhanced Filters Section */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Filter Questions
              </h2>
            </div>
            
            {/* Select All with modern styling */}
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={isAllSelected} 
                  onChange={toggleSelectAll}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                  isAllSelected 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500' 
                    : 'border-gray-300 group-hover:border-blue-400'
                }`}>
                  {isAllSelected && (
                    <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                Select All ({filteredQuestions.length})
              </span>
            </label>
          </div>

          {/* Modern Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Question Type</span>
              </label>
              <select 
                value={typeDraft} 
                onChange={(e) => setTypeDraft(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-gray-900 font-medium"
              >
                <option value="">All Types</option>
                {typeOptions.map(type => (
                  <option key={type} value={type}>
                    {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>Grade Level</span>
              </label>
              <select 
                value={gradeDraft} 
                onChange={(e) => setGradeDraft(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-gray-900 font-medium"
              >
                <option value="">All Grades</option>
                {gradeOptions.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Difficulty</span>
              </label>
              <select 
                value={difficultyDraft} 
                onChange={(e) => setDifficultyDraft(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-gray-900 font-medium"
              >
                <option value="">All Levels</option>
                {difficultyOptions.map(diff => (
                  <option key={diff} value={diff}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Bloom's Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                <span>Bloom&apos;s Level</span>
              </label>
              <select 
                value={bloomsDraft} 
                onChange={(e) => setBloomsDraft(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-gray-900 font-medium"
              >
                <option value="">All Levels</option>
                {bloomsOptions.map(bloom => (
                  <option key={bloom} value={bloom}>{bloom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex justify-between items-center">
            <button 
              onClick={clearFilters}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear All</span>
            </button>
            
            <button 
              onClick={applyFilters}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Modern Export Panel */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Export Options</h3>
                <p className="text-sm text-gray-600">{selectedIds.length} questions selected</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={handleExportWorksheet}
                disabled={selectedIds.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Worksheet</span>
              </button>
              
              <button 
                onClick={handleExportAnswerKey}
                disabled={selectedIds.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Export Answer Key</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          // Loading Skeleton
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-6 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-5 h-5 bg-gray-300 rounded"></div>
                  <div className="flex-1 space-y-4">
                    <div className="flex space-x-2">
                      <div className="w-20 h-6 bg-gray-300 rounded-full"></div>
                      <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
                      <div className="w-18 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="w-full h-4 bg-gray-300 rounded"></div>
                    <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          // Enhanced Empty State
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Questions Yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
              Get started by creating your first question. Build engaging content for your students!
            </p>
            <Link href="/create" className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
              Create Your First Question
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.length === 0 ? (
              // No filtered results
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Questions Match</h3>
                <p className="text-gray-600 mb-6">Try adjusting your filters to see more results.</p>
                <button 
                  onClick={clearFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              // Enhanced Question Cards
              filteredQuestions.map((q, idx) => (
                <div key={`${q.id}-${idx}`} className="group backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6 border-b border-gray-200/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Modern Checkbox */}
                        <label className="flex items-center cursor-pointer group/checkbox mt-1">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={!!q.id && selectedIds.includes(q.id)} 
                              onChange={() => q.id && toggleSelect(q.id)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                              q.id && selectedIds.includes(q.id)
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500' 
                                : 'border-gray-300 group-hover/checkbox:border-blue-400'
                            }`}>
                              {q.id && selectedIds.includes(q.id) && (
                                <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </label>
                        
                        <div className="flex-1 space-y-3">
                          {/* Question Metadata Tags */}
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              {q.question_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          
                          {/* Question Text */}
                          <div className="prose prose-lg max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]} 
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                p: ({children}) => <div className="text-gray-900 font-medium leading-relaxed text-lg">{children}</div>
                              }}
                            >
                              {q.question}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => {
                          setShowDeleteModal(true);
                          setPendingDeleteId(q.id!);
                        }}
                        disabled={deletingId === q.id}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200 hover:border-red-300 flex items-center space-x-2 text-sm font-medium"
                      >
                        {deletingId === q.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Options</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, i) => {
                            const cleanedOpt = typeof opt === 'string' ? opt.replace(/^[A-Za-z][\.\)]\s*/i, '') : opt;
                            return (
                              <div key={i} className="flex items-start space-x-3 p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                  {String.fromCharCode(65 + i)}
                                </div>
                                <div className="flex-1 prose prose-sm max-w-none">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkMath]} 
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                      p: ({children}) => <div className="text-gray-800 leading-relaxed">{children}</div>
                                    }}
                                  >
                                    {cleanedOpt}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Answer */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200/50">
                      <h4 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Correct Answer</span>
                      </h4>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({children}) => <div className="text-green-800 font-medium leading-relaxed">{children}</div>
                          }}
                        >
                          {q.correct_answer}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Explanation */}
                    {q.explanation && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50">
                        <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Explanation</span>
                        </h4>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({children}) => <div className="text-blue-800 leading-relaxed">{children}</div>
                            }}
                          >
                            {q.explanation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Footer */}
                  <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-200/50">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Subject: <span className="font-medium text-gray-700">{q.subject}</span></span>
                      <span>Created: <span className="font-medium text-gray-700">
                        {q.created_at ? new Date(q.created_at).toLocaleDateString() : '-'}
                      </span></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Back to Home Link */}
        <div className="pt-8 text-center">
          <Link href="/" className="inline-flex items-center px-6 py-3 text-blue-600 hover:text-blue-800 font-medium transition-colors space-x-2 bg-white/50 rounded-xl hover:bg-white/80 backdrop-blur-sm border border-white/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Modern Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-center text-gray-900 mb-4">Delete Question?</h3>
              <p className="text-gray-600 text-center mb-8 leading-relaxed">
                Are you sure you want to delete this question? This action cannot be undone for your account, 
                but the question will remain in the database.
              </p>
              
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPendingDeleteId(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
                  disabled={deletingId === pendingDeleteId}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all font-medium flex items-center justify-center space-x-2"
                >
                  {deletingId === pendingDeleteId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
