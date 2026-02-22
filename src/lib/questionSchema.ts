import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION SCHEMA (camelCase)
// Used for: generateQuestions, generateNCERTQuestions
// Fields match GeneratedQuestion in database.ts and Question in questionParser.ts
// ─────────────────────────────────────────────────────────────────────────────

// Strict schema — only used to generate the JSON Schema sent to Gemini as
// responseSchema. The enum guides the model toward canonical type values.
const questionSchemaForApi = z.object({
  type: z.enum([
    "multiple-choice",
    "true-false",
    "fill-in-the-blank",
    "short-answer",
    "long-answer",
  ]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
})

// questionArrayJsonSchema is unchanged — same strict enum is still sent to Gemini.
// Cast to any: zodToJsonSchema's overloaded generics cause TypeScript's
// instantiation depth limit to be exceeded with complex Zod object types.
// The cast is safe — zodToJsonSchema only needs a valid Zod schema at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const questionArrayJsonSchema = zodToJsonSchema(z.array(questionSchemaForApi) as any)

// Lenient schema — used for client-side Zod validation in create-questions/page.tsx.
// z.string() accepts variations like "multiple-choice questions", "MCQ", etc.
// processQuestions already normalizes all type variations so this is safe.
const questionSchema = z.object({
  type: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
})

export const questionArraySchema = z.array(questionSchema)

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ SCHEMA (snake_case)
// Used for: generateQuizGame
// Fields match QuizQuestion and QuizGameConfig in src/types/game.ts
// ─────────────────────────────────────────────────────────────────────────────

export const quizQuestionSchema = z.object({
  question: z.string(),
  question_type: z.enum(["MCQ", "True/False", "FIB"]),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().optional(),
  hint: z.string().optional(),
  case_sensitive: z.boolean().optional(),
})

export const quizGameSchema = z.object({
  // Optional metadata — route uses safe fallbacks if absent
  title: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  subject: z.string().optional(),
  grade_level: z.string().optional(),
  // Core payload
  questions: z.array(quizQuestionSchema),
  settings: z.object({
    time_limit: z.number(),
    hints_enabled: z.boolean(),
    show_explanations: z.boolean(),
  }),
})

// Same cast rationale as questionArrayJsonSchema above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const quizGameJsonSchema = zodToJsonSchema(quizGameSchema as any)
