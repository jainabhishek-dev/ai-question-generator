"use client"

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline'
import type {
  NcertBatchWithChapters,
  NcertBatchProgress,
  NcertInputWithChapter,
} from '@/types/ncert'

const STATUS_LABELS: Record<string, string> = {
  awaiting_chapters: 'Awaiting PDFs',
  awaiting_review:   'Ready for Review',
  generating:        'Generating',
  paused:            'Paused',
  completed:         'Completed',
  failed:            'Failed',
}

const STATUS_COLORS: Record<string, string> = {
  awaiting_chapters: 'bg-gray-100 text-gray-600',
  awaiting_review:   'bg-yellow-100 text-yellow-700',
  generating:        'bg-blue-100 text-blue-700',
  paused:            'bg-orange-100 text-orange-700',
  completed:         'bg-green-100 text-green-700',
  failed:            'bg-red-100 text-red-700',
}

async function getToken(): Promise<string> {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

function formatPageNumbers(pages: number[]): string {
  if (!pages || pages.length === 0) return '—'
  const sorted = [...pages].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`)
  return `pp. ${ranges.join(', ')}`
}

type GroupKey = string

interface InputGroup {
  chapterId: string
  chapterName: string
  chapterNumber: number
  topic: string
  subTopic: string
  pageNumbers: number[]
  inputIds: string[]
  count: number
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

export default function NcertBatchDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const batchId = (params?.batchId ?? '') as string

  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<GroupKey | null>(null)
  const [editTopic, setEditTopic] = useState('')
  const [editSubTopic, setEditSubTopic] = useState('')
  const [editPages, setEditPages] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: batchData, error: batchError, isLoading: batchLoading, mutate: mutateBatch } = useSWR(
    user ? ['ncert-batch', batchId, user.id] : null,
    async () => {
      const token = await getToken()
      const res = await fetch(`/api/ncert/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json as { batch: NcertBatchWithChapters; progress: NcertBatchProgress | null }
    },
    {
      refreshInterval: (data) => {
        const s = data?.batch?.status
        return s === 'generating' || s === 'paused' ? 15_000 : 0
      },
    }
  )

  const { data: inputsData, isLoading: inputsLoading, mutate: mutateInputs } = useSWR(
    user && batchData?.batch?.status === 'awaiting_review'
      ? ['ncert-inputs', batchId, user.id]
      : null,
    async () => {
      const token = await getToken()
      const res = await fetch(`/api/ncert/batches/${batchId}/inputs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.inputs as NcertInputWithChapter[]
    }
  )

  const inputGroups = useMemo(() => {
    if (!inputsData) return new Map<string, InputGroup[]>()

    const groupMap = new Map<GroupKey, InputGroup>()
    for (const input of inputsData) {
      const key: GroupKey = `${input.chapter_id}::${input.topic}::${input.sub_topic}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          chapterId: input.chapter_id,
          chapterName: input.chapter.chapter_name,
          chapterNumber: input.chapter.chapter_number,
          topic: input.topic,
          subTopic: input.sub_topic,
          pageNumbers: input.page_numbers,
          inputIds: [],
          count: 0,
        })
      }
      const g = groupMap.get(key)!
      g.inputIds.push(input.id)
      g.count++
    }

    const chapterMap = new Map<string, InputGroup[]>()
    for (const group of groupMap.values()) {
      const ck = `${String(group.chapterNumber).padStart(4, '0')}::${group.chapterId}`
      if (!chapterMap.has(ck)) chapterMap.set(ck, [])
      chapterMap.get(ck)!.push(group)
    }

    return chapterMap
  }, [inputsData])

  function startEdit(group: InputGroup, key: GroupKey) {
    setEditingKey(key)
    setEditTopic(group.topic)
    setEditSubTopic(group.subTopic)
    setEditPages(group.pageNumbers.join(', '))
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingKey(null)
    setSaveError(null)
  }

  async function saveEdit(group: InputGroup) {
    const pages = editPages
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)

    if (!editTopic.trim() || !editSubTopic.trim() || pages.length === 0) {
      setSaveError('All fields are required. Pages must be comma-separated numbers.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const body = { topic: editTopic.trim(), sub_topic: editSubTopic.trim(), page_numbers: pages }

      const results = await Promise.allSettled(
        group.inputIds.map(id =>
          fetch(`/api/ncert/inputs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          }).then(r => r.json())
        )
      )

      const failed = results.filter(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      )
      if (failed.length > 0) {
        throw new Error(`${failed.length} of ${group.inputIds.length} updates failed.`)
      }

      setEditingKey(null)
      mutateInputs()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function callAction(endpoint: string) {
    setActionPending(true)
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      mutateBatch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActionPending(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in.</p>
      </div>
    )
  }

  if (batchLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mt-6" />
          <div className="h-4 bg-gray-100 rounded w-36" />
          <div className="h-40 bg-white border border-gray-200 rounded-xl mt-6" />
        </div>
      </div>
    )
  }

  if (batchError || !batchData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-3">{batchError?.message ?? 'Batch not found.'}</p>
          <Link href="/ncert-pipeline" className="text-indigo-600 text-sm hover:underline">
            ← Back to Pipeline
          </Link>
        </div>
      </div>
    )
  }

  const { batch, progress } = batchData
  const status = batch.status
  const processed = batch.inputs_done + batch.inputs_discarded
  const pct = batch.total_inputs > 0 ? Math.round((processed / batch.total_inputs) * 100) : 0
  const inFlight = (progress?.generating ?? 0) + (progress?.reviewing ?? 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        <Link
          href="/ncert-pipeline"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          NCERT Pipeline
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {batch.grade} — {batch.subject}
                {batch.sub_subject ? ` (${batch.sub_subject})` : ''}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 font-mono">{batch.id}</p>
          </div>

          {status === 'generating' && (
            <button
              onClick={() => callAction('/api/ncert/pause')}
              disabled={actionPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50 transition-colors shrink-0"
            >
              <PauseIcon className="w-4 h-4" />
              {actionPending ? 'Pausing…' : 'Pause'}
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => callAction('/api/ncert/resume')}
              disabled={actionPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
            >
              <PlayIcon className="w-4 h-4" />
              {actionPending ? 'Resuming…' : 'Resume'}
            </button>
          )}
        </div>

        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* ── awaiting_chapters ───────────────────────────────────────────────── */}
        {status === 'awaiting_chapters' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <ClockIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <h2 className="text-base font-semibold text-gray-700 mb-2">Waiting for Chapter PDFs</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Upload NCERT chapter PDFs and page images to Google Drive. n8n will detect them and
              call{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">/api/ncert/process-chapter</code>{' '}
              to extract topics automatically.
            </p>
            <div className="mt-5 inline-block bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-left">
              <p className="text-xs text-gray-400 mb-1">Batch ID (use in n8n)</p>
              <p className="text-sm font-mono text-gray-800">{batch.id}</p>
            </div>
          </div>
        )}

        {/* ── awaiting_review ─────────────────────────────────────────────────── */}
        {status === 'awaiting_review' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Review Extracted Topics</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Correct any topic names, sub-topics, or page ranges before approving generation.
                </p>
              </div>

              {inputsLoading ? (
                <div className="p-6 space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : inputGroups.size === 0 ? (
                <div className="p-8 text-sm text-gray-400 text-center">No topics found.</div>
              ) : (
                Array.from(inputGroups.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([chapterKey, groups]) => {
                    const first = groups[0]
                    return (
                      <div key={chapterKey}>
                        <div className="px-6 py-2.5 bg-gray-50 border-y border-gray-100">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Chapter {first.chapterNumber}: {first.chapterName}
                          </span>
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-gray-400 border-b border-gray-100">
                              <th className="text-left px-6 py-2 font-medium w-[30%]">Topic</th>
                              <th className="text-left px-4 py-2 font-medium w-[30%]">Sub-topic</th>
                              <th className="text-left px-4 py-2 font-medium">Pages</th>
                              <th className="text-right px-6 py-2 font-medium">Rows</th>
                              <th className="px-4 py-2 w-20" />
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map(group => {
                              const key: GroupKey = `${group.chapterId}::${group.topic}::${group.subTopic}`
                              const isEditing = editingKey === key

                              return (
                                <tr
                                  key={key}
                                  className={`border-b border-gray-50 text-sm ${isEditing ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                  {isEditing ? (
                                    <>
                                      <td className="px-6 py-2">
                                        <input
                                          type="text"
                                          value={editTopic}
                                          onChange={e => setEditTopic(e.target.value)}
                                          className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={editSubTopic}
                                          onChange={e => setEditSubTopic(e.target.value)}
                                          className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={editPages}
                                          onChange={e => setEditPages(e.target.value)}
                                          placeholder="1, 2, 3"
                                          className="w-28 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      </td>
                                      <td className="text-right px-6 py-2 text-gray-400">
                                        {group.count}
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <button
                                            onClick={() => saveEdit(group)}
                                            disabled={saving}
                                            title="Save"
                                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                          >
                                            <CheckIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            title="Cancel"
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                          >
                                            <XMarkIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                        {saveError && editingKey === key && (
                                          <p className="text-xs text-red-600 mt-1 text-right">
                                            {saveError}
                                          </p>
                                        )}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-6 py-3 text-gray-800 font-medium">
                                        {group.topic}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600">{group.subTopic}</td>
                                      <td className="px-4 py-3 text-gray-500 text-xs">
                                        {formatPageNumbers(group.pageNumbers)}
                                      </td>
                                      <td className="text-right px-6 py-3 text-gray-400">
                                        {group.count}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => startEdit(group, key)}
                                          disabled={editingKey !== null}
                                          title="Edit"
                                          className="p-1 text-gray-300 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                                        >
                                          <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {inputsData ? `${inputsData.length} questions to generate` : ''}
              </p>
              <button
                onClick={() => callAction('/api/ncert/start-generation')}
                disabled={actionPending || inputsLoading || !inputsData?.length || editingKey !== null}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <SparklesIcon className="w-4 h-4" />
                {actionPending ? 'Starting…' : 'Approve & Start Generation'}
              </button>
            </div>
          </div>
        )}

        {/* ── generating / paused / completed / failed ───────────────────────── */}
        {['generating', 'paused', 'completed', 'failed'].includes(status) && (
          <div className="space-y-6">

            {/* Progress card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Overall Progress</h2>
                {status === 'completed' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                {status === 'failed' && <ExclamationCircleIcon className="w-5 h-5 text-red-500" />}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{pct}%</span>
                <span>{processed} / {batch.total_inputs}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
                <div
                  className={`h-2 rounded-full transition-all ${status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Passed" value={batch.inputs_done} color="text-green-600" />
                <Stat label="Discarded" value={batch.inputs_discarded} color="text-red-500" />
                <Stat label="In Progress" value={inFlight} color="text-blue-500" />
                <Stat
                  label="Pending"
                  value={Math.max(0, batch.total_inputs - processed - inFlight)}
                  color="text-gray-500"
                />
              </div>

              {batch.current_chapter_name && status === 'generating' && (
                <p className="mt-4 text-xs text-indigo-600 font-medium">
                  Currently: {batch.current_chapter_name}
                </p>
              )}
              {status === 'paused' && (
                <p className="mt-4 text-xs text-orange-600">
                  Paused — n8n will stop after the current in-flight question finishes.
                </p>
              )}
              {batch.error_message && status === 'failed' && (
                <p className="mt-4 text-xs text-red-600">{batch.error_message}</p>
              )}
            </div>

            {/* Chapter list */}
            {batch.chapters && batch.chapters.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Chapters</h2>
                </div>
                <ul className="divide-y divide-gray-50">
                  {[...batch.chapters]
                    .sort((a, b) => a.chapter_number - b.chapter_number)
                    .map(chapter => {
                      const isCurrent =
                        status === 'generating' &&
                        chapter.chapter_name === batch.current_chapter_name

                      return (
                        <li
                          key={chapter.id}
                          className={`flex items-center gap-3 px-6 py-3 text-sm ${isCurrent ? 'bg-indigo-50' : ''}`}
                        >
                          {isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                          ) : chapter.phase1_status === 'error' ? (
                            <ExclamationCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4 text-green-400 shrink-0" />
                          )}
                          <span
                            className={`flex-1 ${isCurrent ? 'font-medium text-indigo-700' : 'text-gray-700'}`}
                          >
                            Ch {chapter.chapter_number}: {chapter.chapter_name}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-indigo-500 font-medium">
                              Generating…
                            </span>
                          )}
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}

            {/* Completion message */}
            {status === 'completed' && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-800">Batch complete!</p>
                <p className="text-sm text-green-700 mt-1">
                  {batch.inputs_done} questions passed and are now in your question bank.
                  {batch.inputs_discarded > 0 &&
                    ` ${batch.inputs_discarded} discarded after max retries.`}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
