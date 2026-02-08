# AI Question Generator - Copilot Instructions

## Project Overview
Educational platform for AI-powered question generation, lesson planning, and game-based learning. Built on Next.js 15 (App Router), TypeScript, Supabase, and Google AI (Gemini + Imagen).

## Architecture

### Core Features
- **Question Generation**: Advanced & NCERT-based questions via Gemini API with image generation (Imagen)
- **Lesson Planning**: Multi-step wizard extracting objectives from PDFs, generating structured lesson plans
- **Game System**: Quiz games, flashcards, matching games with leaderboards and achievements
- **PDF Export**: Server-side PDF generation using Puppeteer + Chromium

### Tech Stack
- **Frontend**: Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API routes (App Router & Pages Router hybrid)
- **Database**: Supabase (PostgreSQL) with RLS policies
- **AI**: Google Gemini (`@google/generative-ai`), Gemini 3 Pro Image (`@google/genai`)
- **Auth**: Supabase Auth with anonymous user support

## Critical Conventions

### Dual Router Architecture
The project uses **both** App Router and Pages Router:
- **App Router**: Primary routes under `src/app/` (client pages, most API routes)
- **Pages Router**: PDF export endpoint at `src/pages/api/export-pdf.ts` (uses Puppeteer/Chromium)
- **Why**: Puppeteer requires Pages Router for proper server-side execution

### Authentication Pattern
Users can be authenticated OR anonymous:
```typescript
// Database records support null user_id for anonymous users
user_id: string | null
is_public: boolean  // true for anonymous, false for authenticated

// Always check user status in database functions
export const saveQuestions = async (
  inputs: Inputs, 
  questions: GeneratedQuestion[],
  userId?: string | null  // Accept null!
)
```

Anonymous users store ratings in `localStorage` with key pattern `rated_question_${questionId}`.

### Supabase Client Pattern
Two Supabase clients exist:
- `src/lib/supabase.ts`: Browser client (`createBrowserClient`) for client components
- `src/lib/supabaseServer.ts`: Server client for API routes with auth context
  - Use `createAuthenticatedSupabaseClient(request)` in App Router APIs
  - Use `getUserFromAuthenticatedRequest(request)` to extract user from JWT

### Question Data Flow
1. **Generation**: `src/lib/gemini.ts` → AI prompt construction → Gemini API
2. **Parsing**: `src/lib/questionParser.ts` → `cleanJsonText()` → structured `Question[]`
3. **Storage**: `src/lib/database.ts` → `saveQuestions()` → Supabase `questions` table
4. **Display**: `SwipeableQuestions.tsx` → swipeable cards with KaTeX math rendering

### Image Generation Workflow
Questions support inline image placeholders:
- **Format**: `[IMG: detailed_description]` in question text
- **Extraction**: `extractImagePromptsFromQuestion()` parses placeholders
- **Generation**: `src/lib/imagenService.ts` → Imagen API → Supabase Storage (`images` bucket)
- **Tables**: `image_prompts` (AI prompts) + `question_images` (generated attempts)

### Database Schema Locations
- **Questions**: `DATABASE_SCHEMA.sql` (questions, image_prompts, question_images)
- **Games**: `GAME_DATABASE_SCHEMA.sql` (games, game_plays, leaderboards)
- **RLS Policies**: All tables use Row Level Security (check `auth.uid()` patterns)

## Development Workflows

### Running Locally
```bash
npm run dev          # Next.js dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
```

### Environment Variables Required
```env
NEXT_PUBLIC_GEMINI_API_KEY=      # Google AI API key (Gemini + Imagen)
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
GEMINI_API_KEY_SERVER=           # Server-side Gemini key (optional, falls back to public)
```

### PDF Export Debugging
PDF generation uses Puppeteer with Sparticuz Chromium:
- Route: `POST /api/export-pdf` (Pages Router)
- Service: `src/server/pdfService.ts`
- Config: `next.config.ts` → `serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]`
- Issue: If PDF fails, check Chromium binary download in Vercel logs

### Supabase Setup
Before using image generation or games:
1. Run SQL schemas: `DATABASE_SCHEMA.sql`, `GAME_DATABASE_SCHEMA.sql`
2. Create storage bucket: `INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);`
3. Apply RLS policies from SQL files

## Code Patterns

### Error Handling Standard
```typescript
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Unknown error occurred';
};
```
Used consistently across `database.ts`, `gameDatabase.ts`, `lessonPlanDatabase.ts`.

### Math Rendering
Uses `react-markdown` + `remark-math` + `rehype-katex`:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

<ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
  {question.question}
</ReactMarkdown>
```
Inline math: `$equation$`, block math: `$$equation$$`.

### JSON Cleaning Utility
AI responses often contain markdown code fences:
```typescript
import { cleanJsonText } from './jsonCleaner';
const parsed = JSON.parse(cleanJsonText(aiResponse));
```
Always use `cleanJsonText()` before parsing Gemini outputs.

### Image URLs (Next.js Image)
Supabase Storage images configured in `next.config.ts`:
```typescript
remotePatterns: [
  { hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }
]
```

## Common Pitfalls

1. **RLS Blocking Queries**: If Supabase queries fail with no data, check RLS policies. Anonymous reads may need `OR (is_public = true)` clauses.

2. **PDF Export 500 Errors**: Ensure `src/pages/api/export-pdf.ts` exists (not in App Router). Check Chromium binary permissions on Vercel.

3. **Image Generation Limits**: Gemini 3 Pro Image supports 65K tokens (essentially unlimited for educational content). Prompts >1500 chars trigger warnings but are supported. Use detailed, narrative descriptions with specific layout, labels, and text rendering instructions.

4. **Question Type Mismatches**: `correctAnswer` format varies:
   - MCQ: Letter only (`'A'`, `'B'`, etc.)
   - True/False: `'True'` or `'False'` (exact string)
   - Fill-blank/Short: Plain text answer

5. **Client vs Server Imports**: Never import `supabaseServer.ts` in client components. Use `supabase.ts` for browser, `supabaseServer.ts` for API routes.

## Key Files Reference
- **AI Prompts**: `src/lib/gemini.ts`, `src/lib/ncertPrompt.ts`, `src/lib/lessonPlanPrompt.ts`
- **Data Access**: `src/lib/database.ts` (questions), `src/lib/gameDatabase.ts` (games), `src/lib/lessonPlanDatabase.ts` (lesson plans)
- **Image Pipeline**: `src/lib/imagenClient.ts` (primary, client-side), `src/lib/imagenService.ts` (server-side), `src/lib/imageStorage.ts`, `src/lib/imagePromptTemplates.ts`
- **Main Page**: `src/app/page.tsx` (question generator UI)
- **Auth Context**: `src/contexts/AuthContext.tsx` (user state management)
