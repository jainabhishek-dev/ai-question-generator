/**
 * reviewerPrompt.ts
 *
 * Defines the 10-parameter review prompt for Gemini,
 * and builds the rewrite prompt when a question fails review.
 *
 * This file has no side effects — it only exports pure functions
 * and the Zod-derived JSON schema used for structured output.
 */

import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** The context passed to the reviewer — matches what the generator was given */
export interface ReviewContext {
  subject: string
  subSubject?: string | null
  topic: string
  subTopic?: string | null
  grade: string
  difficulty: string
  bloomsLevel: string
  questionType: string   // the specific type of this question (multiple-choice, etc.)
  questionSource: string // 'general' or 'ncert'
}

/** A single parameter result from the reviewer */
export interface ParameterResult {
  pass: boolean
  feedback: string // empty string when pass = true
}

/** Full structured result returned by Gemini after reviewing one question */
export interface ReviewResult {
  p1: ParameterResult  // Construct Validity
  p2: ParameterResult  // Single Concept Focus
  p3: ParameterResult  // Bloom's Taxonomy Alignment
  p4: ParameterResult  // Command Word Correctness
  p5: ParameterResult  // Age and Grade Appropriateness
  p6: ParameterResult  // Question Clarity
  p7: ParameterResult  // Option Parallelism (MCQ only — pass:true if not MCQ)
  p8: ParameterResult  // Distractor Quality + Answer Uniqueness (MCQ only — pass:true if not MCQ)
  p9: ParameterResult  // Factual and Conceptual Accuracy
  p10: ParameterResult // Explanation Quality
  overall_passed: boolean
  parameters_passed: number
  rewrite_instructions: string // empty string when overall_passed = true
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for Gemini's responseSchema (structured output enforcement)
// ─────────────────────────────────────────────────────────────────────────────

const parameterResultSchema = z.object({
  pass: z.boolean(),
  feedback: z.string(),
})

const reviewResultSchema = z.object({
  p1:  parameterResultSchema,
  p2:  parameterResultSchema,
  p3:  parameterResultSchema,
  p4:  parameterResultSchema,
  p5:  parameterResultSchema,
  p6:  parameterResultSchema,
  p7:  parameterResultSchema,
  p8:  parameterResultSchema,
  p9:  parameterResultSchema,
  p10: parameterResultSchema,
  overall_passed:        z.boolean(),
  parameters_passed:     z.number(),
  rewrite_instructions:  z.string(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reviewResultJsonSchema = zodToJsonSchema(reviewResultSchema as any)

// ─────────────────────────────────────────────────────────────────────────────
// The core reviewer system prompt (static, shared across all questions)
// ─────────────────────────────────────────────────────────────────────────────

export const REVIEWER_SYSTEM_PROMPT = `You are a strict educational question quality reviewer for K-12 and higher education content.

You will receive one generated question along with its metadata (subject, grade, difficulty, Bloom's level, type).
Review it on exactly 10 parameters.

For each parameter: set "pass" to true or false.
Set "feedback" to an empty string when pass is true.
When pass is false, write specific, actionable feedback — it will be given to another AI to rewrite the question.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

P1 — CONSTRUCT VALIDITY
Does the question test exactly the stated topic/concept?
FAIL if: it tests unrelated knowledge, includes tricks, or requires knowledge outside the stated topic.

P2 — SINGLE CONCEPT FOCUS
Does the question test exactly one concept at a time?
FAIL if: answering correctly requires mastery of two or more separate concepts.
Note: Long-answer may have one primary + one supporting concept — that is acceptable.

P3 — BLOOM'S TAXONOMY ALIGNMENT
Does the question genuinely require the stated cognitive level?
  Remember   → requires pure recall of a fact/definition/formula
  Understand → requires explanation or interpretation in own words
  Apply      → requires using a concept/formula/rule in a new situation
  Analyze    → requires breaking down, comparing, or finding relationships
  Evaluate   → requires judgment, justification, or critique with reasoning
  Create     → requires designing, formulating, or constructing something new
FAIL if: the actual cognitive demand is lower or higher than the stated level.

P4 — COMMAND WORD CORRECTNESS
Does the question's main action verb match the Bloom's level?
  Remember   → List / Name / State / Define / Recall / Identify
  Understand → Explain / Describe / Summarize / Interpret / Classify
  Apply      → Calculate / Solve / Use / Apply / Demonstrate / Show
  Analyze    → Compare / Differentiate / Examine / Categorize / Break down
  Evaluate   → Justify / Assess / Argue / Judge / Defend / Critique
  Create     → Design / Construct / Formulate / Develop / Propose
FAIL if: the verb belongs to a different Bloom's level than the one specified.

P5 — AGE AND GRADE APPROPRIATENESS
Two checks:
  Language: vocabulary and sentence complexity must match the grade reading level.
  Content: topic, context, and examples must be suitable for the age group.
  No adult themes, violence, political content, or distressing scenarios for young learners.
FAIL if either check fails.

P6 — QUESTION CLARITY AND UNAMBIGUITY
Can the question be interpreted in exactly one way by a student at this grade level?
FAIL if: it is ambiguous, uses double negatives, has vague scope, or can be validly answered in multiple different ways.

P7 — OPTION PARALLELISM [MCQ ONLY]
If the question type is NOT multiple-choice, set pass to true and feedback to empty string.
If the question type IS multiple-choice:
HARD FAIL if options are inconsistently mixed in length or structure.
All four options must belong to the same category:
  Category A: All short — 1 to 3 words or 1 to 2 numbers
  Category B: All medium — short phrases of similar length
  Category C: All long — complete sentences of similar length
The correct answer must not be noticeably longer, more qualified, or more detailed than the distractors.

P8 — DISTRACTOR QUALITY AND ANSWER UNIQUENESS [MCQ ONLY]
If the question type is NOT multiple-choice, set pass to true and feedback to empty string.
If the question type IS multiple-choice:
Part A — Uniqueness: Exactly one option is correct. No two options are both valid.
No "all of the above" or "none of the above."
Part B — Distractor quality: Each wrong option must represent a real and common student misconception.
It must be plausible to a student who partially understands the concept.
Random fillers or obviously absurd options = FAIL.
FAIL if either Part A or Part B fails.

P9 — FACTUAL AND CONCEPTUAL ACCURACY
Are all facts, formulas, definitions, dates, scientific relationships, and calculations
in the question, options, and correct answer accurate?
FAIL if any information is factually wrong, scientifically inaccurate, or mathematically incorrect.

P10 — EXPLANATION QUALITY
A good explanation must:
  (1) State the correct answer clearly
  (2) Explain the reasoning step by step
  (3) Optionally address why common wrong answers are wrong
FAIL if: it only restates the answer without reasoning, or introduces irrelevant concepts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After reviewing all 10 parameters:
- Set overall_passed to true only if ALL 10 parameters passed.
- Set parameters_passed to the count of parameters where pass is true (0–10).
- If overall_passed is false: write consolidated rewrite_instructions combining all failed parameter feedback into a single clear instruction set for the generator.
- If overall_passed is true: set rewrite_instructions to empty string.`

// ─────────────────────────────────────────────────────────────────────────────
// buildReviewPrompt
// Constructs the full user-turn message for the reviewer call.
// Includes the question being reviewed and its full generation context.
// ─────────────────────────────────────────────────────────────────────────────

export function buildReviewPrompt(
  question: {
    type: string
    question: string
    options?: string[] | null
    correctAnswer: string
    explanation?: string | null
  },
  context: ReviewContext
): string {
  const contextBlock = [
    `Subject: ${context.subject}${context.subSubject ? ` – ${context.subSubject}` : ''}`,
    `Topic: ${context.topic}${context.subTopic ? ` – ${context.subTopic}` : ''}`,
    `Grade: ${context.grade}`,
    `Difficulty: ${context.difficulty}`,
    `Bloom's Level: ${context.bloomsLevel}`,
    `Question Type: ${context.questionType}`,
  ].join('\n')

  const questionBlock = JSON.stringify(
    {
      type: question.type,
      question: question.question,
      options: question.options ?? null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? '',
    },
    null,
    2
  )

  return `GENERATION CONTEXT:
${contextBlock}

QUESTION TO REVIEW:
${questionBlock}

Review this question on all 10 parameters now.`
}

// ─────────────────────────────────────────────────────────────────────────────
// buildRewritePrompt
// Constructs the generation prompt for a rewrite attempt.
// Injects the rewrite_instructions from the previous review result
// so the generator knows exactly what to fix.
// ─────────────────────────────────────────────────────────────────────────────

export function buildRewritePrompt(
  originalPrompt: string,
  reviewResult: ReviewResult,
  attemptNumber: number
): string {
  const failedParams = (Object.entries(reviewResult) as [string, ParameterResult | boolean | number | string][])
    .filter(([key, value]) =>
      key.startsWith('p') &&
      key !== 'parameters_passed' &&
      typeof value === 'object' &&
      value !== null &&
      'pass' in value &&
      !(value as ParameterResult).pass
    )
    .map(([key]) => key.toUpperCase())

  return `${originalPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REWRITE INSTRUCTIONS (Attempt ${attemptNumber} of 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The previous version of this question failed review on: ${failedParams.join(', ')}.

You MUST fix all of the following issues before regenerating:

${reviewResult.rewrite_instructions}

Generate a completely new question that addresses all of these issues.
Do not repeat the previous question text.`
}
