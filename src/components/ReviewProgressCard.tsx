"use client"

import type { GenerationJobEvent } from '@/lib/database'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionSlotStatus =
  | 'waiting'      // Not started yet
  | 'generating'   // Calling Gemini
  | 'parse_error'  // Parse failed, retrying
  | 'reviewing'    // Reviewing with 10 parameters
  | 'failed'       // Some parameters failed, about to rewrite
  | 'rewriting'    // Rewriting based on feedback
  | 'passed'       // All 10 parameters passed
  | 'discarded'    // Max attempts reached

export interface ParameterState {
  pass: boolean | null  // null = not yet reviewed
  feedback: string
}

export interface QuestionSlotState {
  index: number
  questionType: string
  status: QuestionSlotStatus
  attempt: number
  parameters: {
    p1: ParameterState; p2: ParameterState; p3: ParameterState
    p4: ParameterState; p5: ParameterState; p6: ParameterState
    p7: ParameterState; p8: ParameterState; p9: ParameterState
    p10: ParameterState
  } | null
  parametersPassed: number | null
  discardReason?: string
  parseAttempts: number
}

const PARAM_LABELS: Record<string, string> = {
  p1: 'Construct Validity',
  p2: 'Single Concept',
  p3: "Bloom's Alignment",
  p4: 'Command Word',
  p5: 'Age Appropriate',
  p6: 'Clarity',
  p7: 'Option Parallelism',
  p8: 'Distractor Quality',
  p9: 'Factual Accuracy',
  p10: 'Explanation Quality',
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  'multiple-choice':   'MCQ',
  'true-false':        'True / False',
  'fill-in-the-blank': 'Fill in Blank',
  'short-answer':      'Short Answer',
  'long-answer':       'Long Answer',
}

// ─────────────────────────────────────────────────────────────────────────────
// applyEventToSlot
// Pure function — takes a slot state and an event, returns new slot state.
// Called by the page component when new events arrive from polling.
// ─────────────────────────────────────────────────────────────────────────────

const nullParam: ParameterState = { pass: null, feedback: '' }
const nullParameters = {
  p1: nullParam, p2: nullParam, p3: nullParam, p4: nullParam,
  p5: nullParam, p6: nullParam, p7: nullParam, p8: nullParam,
  p9: nullParam, p10: nullParam,
}

export function applyEventToSlot(
  slot: QuestionSlotState,
  event: GenerationJobEvent
): QuestionSlotState {
  const payload = event.payload ?? {}

  switch (event.event_type) {
    case 'generating':
      return { ...slot, status: 'generating', parameters: null, parametersPassed: null }

    case 'parse_error':
      return {
        ...slot,
        status: 'parse_error',
        parseAttempts: (payload.attempt as number) ?? slot.parseAttempts + 1,
      }

    case 'reviewing':
      return { ...slot, status: 'reviewing' }

    case 'failed': {
      const review = (payload.review ?? {}) as Record<string, { pass: boolean; feedback: string }>
      const paramKeys = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'] as const
      const parameters = Object.fromEntries(
        paramKeys.map(k => [k, review[k] ?? nullParam])
      ) as QuestionSlotState['parameters']
      return {
        ...slot,
        status: 'failed',
        parameters,
        parametersPassed: (payload.parametersPassed as number) ?? null,
      }
    }

    case 'rewriting':
      return {
        ...slot,
        status: 'rewriting',
        attempt: (payload.attempt as number) ?? slot.attempt,
      }

    case 'passed': {
      const review = (payload.review ?? {}) as Record<string, { pass: boolean; feedback: string }>
      const paramKeys = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'] as const
      const parameters = Object.fromEntries(
        paramKeys.map(k => [k, review[k] ?? { pass: true, feedback: '' }])
      ) as QuestionSlotState['parameters']
      return {
        ...slot,
        status: 'passed',
        parameters,
        parametersPassed: 10,
        attempt: (payload.attempt as number) ?? slot.attempt,
      }
    }

    case 'discarded':
      return {
        ...slot,
        status: 'discarded',
        discardReason: (payload.reason as string) ?? 'Max rewrite attempts reached.',
      }

    default:
      return slot
  }
}

/** Build the initial slot states from the question type breakdown in inputs */
export function buildInitialSlots(inputs: {
  numMCQ: number
  numTrueFalse: number
  numFillBlank: number
  numShortAnswer: number
  numLongAnswer: number
}): QuestionSlotState[] {
  const typeList: string[] = [
    ...Array(inputs.numMCQ).fill('multiple-choice'),
    ...Array(inputs.numTrueFalse).fill('true-false'),
    ...Array(inputs.numFillBlank).fill('fill-in-the-blank'),
    ...Array(inputs.numShortAnswer).fill('short-answer'),
    ...Array(inputs.numLongAnswer).fill('long-answer'),
  ]
  return typeList.map((questionType, index) => ({
    index,
    questionType,
    status: 'waiting',
    attempt: 1,
    parameters: null,
    parametersPassed: null,
    parseAttempts: 0,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewProgressCard component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  slot: QuestionSlotState
}

export default function ReviewProgressCard({ slot }: Props) {
  const typeLabel = QUESTION_TYPE_LABELS[slot.questionType] ?? slot.questionType
  const paramKeys = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'] as const

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusConfig: Record<QuestionSlotStatus, { label: string; color: string; pulse: boolean }> = {
    waiting:     { label: 'Waiting',                  color: 'text-gray-400 bg-gray-100 dark:bg-gray-800',              pulse: false },
    generating:  { label: 'Generating...',            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',              pulse: true  },
    parse_error: { label: `Format Error — Retrying`, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950',           pulse: true  },
    reviewing:   { label: 'Reviewing Quality...',     color: 'text-violet-600 bg-violet-50 dark:bg-violet-950',        pulse: true  },
    failed:      { label: 'Rewriting...',             color: 'text-orange-600 bg-orange-50 dark:bg-orange-950',        pulse: true  },
    rewriting:   { label: `Rewriting (Attempt ${slot.attempt}/3)...`, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', pulse: true },
    passed:      { label: '✓ Passed',                color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950',      pulse: false },
    discarded:   { label: 'Could not generate',      color: 'text-red-600 bg-red-50 dark:bg-red-950',                 pulse: false },
  }

  const { label: statusLabel, color: statusColor, pulse } = statusConfig[slot.status]

  return (
    <div className={`
      rounded-xl border p-4 transition-all duration-300
      ${slot.status === 'passed'    ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20' : ''}
      ${slot.status === 'discarded' ? 'border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20' : ''}
      ${!['passed','discarded'].includes(slot.status) ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Q{slot.index + 1}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            {typeLabel}
          </span>
          {slot.attempt > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
              Attempt {slot.attempt}/3
            </span>
          )}
        </div>

        {/* Status badge */}
        <span className={`
          text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}
          ${pulse ? 'animate-pulse' : ''}
        `}>
          {statusLabel}
        </span>
      </div>

      {/* Waiting state — simple placeholder */}
      {slot.status === 'waiting' && (
        <p className="text-xs text-gray-400 dark:text-gray-600 italic">
          In queue...
        </p>
      )}

      {/* Generating / reviewing / rewriting — animated bar */}
      {['generating', 'reviewing', 'rewriting', 'parse_error'].includes(slot.status) && (
        <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 animate-[shimmer_1.5s_ease-in-out_infinite]"
               style={{ width: '60%' }} />
        </div>
      )}

      {/* Parse error detail */}
      {slot.status === 'parse_error' && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Regenerating due to format error
          {slot.parseAttempts > 0 ? ` (attempt ${slot.parseAttempts}/3)` : ''}
        </p>
      )}

      {/* Parameter grid — shown for failed, passed states */}
      {slot.parameters && ['failed', 'rewriting', 'passed'].includes(slot.status) && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {paramKeys.map((key) => {
              const param = slot.parameters![key]
              const isNA = slot.questionType !== 'multiple-choice' && (key === 'p7' || key === 'p8')
              return (
                <div key={key} className="flex items-center gap-1.5 min-w-0">
                  <span className={`flex-shrink-0 text-sm leading-none ${
                    isNA
                      ? 'text-gray-300 dark:text-gray-600'
                      : param.pass === true
                        ? 'text-emerald-500'
                        : param.pass === false
                          ? 'text-red-500'
                          : 'text-gray-300 dark:text-gray-600'
                  }`}>
                    {isNA ? '—' : param.pass === true ? '✓' : param.pass === false ? '✗' : '○'}
                  </span>
                  <span className={`text-xs truncate ${
                    param.pass === false && !isNA
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {PARAM_LABELS[key]}
                  </span>
                </div>
              )
            })}
          </div>

          {slot.parametersPassed !== null && slot.status !== 'passed' && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {slot.parametersPassed}/10 passed
            </p>
          )}
        </>
      )}

      {/* Passed — all green */}
      {slot.status === 'passed' && slot.parameters && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {paramKeys.map((key) => (
            <div key={key} className="flex items-center gap-1.5 min-w-0">
              <span className="flex-shrink-0 text-sm text-emerald-500 leading-none">✓</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {PARAM_LABELS[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Discarded state */}
      {slot.status === 'discarded' && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
          {slot.discardReason ?? 'Unable to generate a quality question for this topic combination.'}
        </p>
      )}
    </div>
  )
}
