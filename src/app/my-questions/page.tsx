'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import 'katex/dist/katex.min.css'
import Link from 'next/link'
import { QuestionRecord } from '@/types/question'
import { getUserQuestions, softDeleteUserQuestion } from '@/lib/database'
import FilterPanel from './FilterPanel'
import ExportPanel from './ExportPanel'
import QuestionCard from './QuestionCard'
import Pagination from './Pagination'
import DeleteModal from './DeleteModal'
import LoadingSkeleton from './LoadingSkeleton'

export default function MyQuestionsPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters (applied)
  const [typeFilter, setTypeFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [bloomsFilter, setBloomsFilter] = useState('')

  // Draft filter UI state
  const [typeDraft, setTypeDraft] = useState('')
  const [gradeDraft, setGradeDraft] = useState('')
  const [difficultyDraft, setDifficultyDraft] = useState('')
  const [bloomsDraft, setBloomsDraft] = useState('')

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  // Selection + pagination
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredQuestions = questions.filter(q => {
    return (
      (!typeFilter || q.question_type === typeFilter) &&
      (!gradeFilter || q.grade === gradeFilter) &&
      (!difficultyFilter || q.difficulty === difficultyFilter) &&
      (!bloomsFilter || q.blooms_level === bloomsFilter)
    )
  })

  const totalPages = Math.ceil(filteredQuestions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, gradeFilter, difficultyFilter, bloomsFilter])

  const isAllSelected =
    paginatedQuestions.length > 0 &&
    paginatedQuestions.every(q => q.id && selectedIds.includes(q.id))

  const toggleSelectAll = () => {
    const currentPageIds = paginatedQuestions.map(q => q.id!).filter(Boolean)
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])])
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
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
        setError(err?.message || 'Unknown error')
      })
      .finally(() => setIsLoading(false))
  }, [user])

  // Options
  const typeOptions = ['multiple-choice', 'fill-in-the-blank', 'true-false', 'short-answer', 'long-answer']
  const gradeOptions = ["Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12",
  "Undergraduate","Graduate"]
  const difficultyOptions = ['Easy', 'Medium', 'Hard']
  const bloomsOptions = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

  // Delete
  async function handleDelete(questionId: number) {
    if (!user || !questionId) return
    setDeletingId(questionId)
    setError(null)
    try {
      const res = await softDeleteUserQuestion(questionId, user.id)
      if (!res.success) {
        setError(res.error || 'Failed to delete question.')
      } else {
        setQuestions(prev => prev.filter(q => q.id !== questionId))
        setSelectedIds(prev => prev.filter(id => id !== questionId))
        setShowDeleteModal(false)
        setPendingDeleteId(null)
      }
    } catch (err: unknown) {
      const errorMessage =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message?: string }).message
          : undefined
      setError(`Failed to delete question: ${errorMessage || 'Unknown error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Export worksheet
  async function handleExportWorksheet(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault()
    setError(null)
    if (selectedIds.length === 0) {
      setError('No questions selected to export.')
      return
    }
    try {
      const accessToken = user?.accessToken
      if (!accessToken) {
        setError('Could not get user access token. Please log in again.')
        return
      }
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIds,
          userId: user?.id,
          exportType: 'worksheet',
          preferences: { formatting: { fontSize: 14, showHeaders: true, showFooters: true } },
          accessToken
        })
      })
      if (!res.ok) {
        let errMsg = 'Failed to export PDF'
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch {}
        setError(errMsg)
        return
      }
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/pdf')) {
        setError('Invalid response format - expected PDF')
        return
      }
      const blob = await res.blob()
      if (blob.size === 0) {
        setError('Received empty PDF file')
        return
      }
      try {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = 'worksheet.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error occurred:', error)
        setError(error instanceof Error ? error.message : 'Failed to download PDF file')
      }
    } catch (err: unknown) {
      const errorMessage =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message?: string }).message
          : undefined
      setError(`Failed to export Worksheet: ${errorMessage || 'Unknown error'}`)
    }
  }

  // Export answer key
  async function handleExportAnswerKey(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault()
    setError(null)
    if (selectedIds.length === 0) {
      setError('No questions selected to export.')
      return
    }
    try {
      const accessToken = user?.accessToken
      if (!accessToken) {
        setError('Could not get user access token. Please log in again.')
        return
      }
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIds,
          userId: user?.id,
          exportType: 'answer-key',
          preferences: { formatting: { fontSize: 14, showHeaders: true, showFooters: true } },
          accessToken
        })
      })
      if (!res.ok) {
        let errMsg = 'Failed to export PDF'
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch {}
        setError(errMsg)
        return
      }
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/pdf')) {
        setError('Invalid response format - expected PDF')
        return
      }
      const blob = await res.blob()
      if (blob.size === 0) {
        setError('Received empty PDF file')
        return
      }
      try {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = 'answer-key.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error occurred:', error)
        setError(error instanceof Error ? error.message : 'Failed to download PDF file')
      }
    } catch (err: unknown) {
      const errorMessage =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message?: string }).message
          : undefined
      setError(`Failed to export Answer Key: ${errorMessage || 'Unknown error'}`)
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
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-4 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-full sm:max-w-6xl mx-auto px-2 sm:px-4 space-y-5 sm:space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-400 dark:to-purple-400">
            My Questions
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-xs sm:max-w-2xl mx-auto dark:text-gray-300">
            Manage, filter, and export your educational content with ease
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <FilterPanel
          typeDraft={typeDraft}
          setTypeDraft={setTypeDraft}
          gradeDraft={gradeDraft}
          setGradeDraft={setGradeDraft}
          difficultyDraft={difficultyDraft}
          setDifficultyDraft={setDifficultyDraft}
          bloomsDraft={bloomsDraft}
          setBloomsDraft={setBloomsDraft}
          typeOptions={typeOptions}
          gradeOptions={gradeOptions}
          difficultyOptions={difficultyOptions}
          bloomsOptions={bloomsOptions}
          applyFilters={applyFilters}
          clearFilters={clearFilters}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          paginatedQuestionsCount={paginatedQuestions.length}
        />

        <ExportPanel
          selectedCount={selectedIds.length}
          handleExportWorksheet={handleExportWorksheet}
          handleExportAnswerKey={handleExportAnswerKey}
        />

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : questions.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">No Questions Yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed text-sm sm:text-base">
              Get started by creating your first question. Build engaging content for your students!
            </p>
            <Link
              href="/"
              className="btn-primary inline-flex items-center"
            >
              Create Your First Question
            </Link>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Questions Match</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-5 text-sm sm:text-base">Try adjusting your filters to see more results.</p>
                <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {paginatedQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No questions on this page.</p>
                  </div>
                ) : (
                paginatedQuestions.map((q, idx) => (
                  <QuestionCard
                    key={`${q.id}-${idx}`}
                    question={q}
                    selected={!!q.id && selectedIds.includes(q.id)}
                    toggleSelect={toggleSelect}
                    setShowDeleteModal={setShowDeleteModal}
                    setPendingDeleteId={setPendingDeleteId}
                    deletingId={deletingId}
                />
              ))
            )}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={filteredQuestions.length}
          />
        )}

        {/* Back to Home */}
        <div className="pt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 text-blue-600 hover:text-blue-800 font-medium transition-colors space-x-2 bg-white/50 rounded-lg sm:rounded-xl hover:bg-white/80 backdrop-blur-sm border border-white/30 dark:bg-gray-900/50 dark:text-blue-300 dark:hover:text-blue-200 dark:hover:bg-gray-900/80 dark:border-gray-700/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
        <DeleteModal
          show={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setPendingDeleteId(null)
          }}
          onDelete={() => pendingDeleteId && handleDelete(pendingDeleteId)}
          deleting={deletingId === pendingDeleteId}
        />
        )}
      </div>
    </main>
  )
}