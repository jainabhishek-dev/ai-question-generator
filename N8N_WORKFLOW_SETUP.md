# n8n Workflow Setup Guide

## Overview

n8n runs the full generate → review → rewrite loop for each question,
avoiding Vercel's 60-second execution timeout.

**What n8n does:**
- Receives a job from Vercel `/api/generate/start`
- Iterates over each question slot (e.g., 5 MCQ + 3 Short Answer)
- Calls Vercel `/api/internal/generate-one` for each question
- Calls Vercel `/api/internal/review-one` to review each question
- Writes results to Supabase (`generation_job_events`, `questions`, `question_reviews`)
- Handles retry logic (max 3 attempts per question)

---

## Step 1: Create n8n Cloud Account

1. Go to [https://n8n.cloud](https://n8n.cloud)
2. Sign up for a free account (5,000 executions/month)
3. Create a new workspace

---

## Step 2: Set Up Credentials in n8n

Go to **Settings → Credentials** and create these:

### Credential 1: Supabase (service role)
- **Type:** Header Auth
- **Name:** `Instaku Supabase Service Role`
- **Header Name:** `apikey`
- **Header Value:** `<your SUPABASE_SERVICE_ROLE_KEY from .env.local>`

Also add a second header for Authorization:
- **Header Name:** `Authorization`
- **Header Value:** `Bearer <your SUPABASE_SERVICE_ROLE_KEY>`

### Credential 2: Internal API Secret
- **Type:** Header Auth
- **Name:** `Instaku Internal API Secret`
- **Header Name:** `X-Internal-Secret`
- **Header Value:** `<your INTERNAL_API_SECRET from .env.local>`

### Credential 3: Webhook Secret Validation
Used to verify incoming webhooks from Vercel.
Keep your `N8N_WEBHOOK_SECRET` — you'll validate it in the workflow code node.

---

## Step 3: Import the Workflow

1. In n8n, go to **Workflows → Import**
2. Import the file: `n8n-workflow-generate-review.json` (in this directory)
3. Open the workflow and update:
   - **Webhook node:** Copy the Production URL → paste into `.env.local` as `N8N_WEBHOOK_URL`
   - **All HTTP Request nodes:** Update the base URL to your Vercel deployment URL
   - **All Supabase HTTP nodes:** Apply the `Instaku Supabase Service Role` credential
   - **All Internal API nodes:** Apply the `Instaku Internal API Secret` credential

---

## Step 4: Update .env.local

After copying the webhook URL from n8n:

```
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/your-webhook-id
N8N_WEBHOOK_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
INTERNAL_API_SECRET=<generate separately>
```

Also add these same secrets to your **Vercel project environment variables** for production.

---

## Step 5: Activate the Workflow

Click **Activate** (toggle in top right) in n8n.
The workflow is now listening for webhooks from your app.

---

## Workflow Logic Summary

```
Webhook Trigger (POST from /api/generate/start)
  │
  ├── Validate webhook secret
  ├── Update generation_jobs status → 'running'
  ├── Build question type list from inputs
  │
  └── Loop over each question slot:
        │
        ├── attempt = 1, rewriteInstructions = ''
        │
        ├── [GENERATE] POST /api/internal/generate-one
        │       { jobId, questionType, attemptNumber, rewriteInstructions }
        │
        ├── IF parseError?
        │   YES → Insert parse_error event
        │         IF attempt < 3 → increment attempt, retry generate
        │         ELSE → Insert discarded event, continue to next slot
        │   NO  → continue
        │
        ├── INSERT into questions (is_user_visible=false, review_status='pending')
        │       → returns questionId
        │
        ├── INSERT parse_error event OR reviewing event
        │
        ├── [REVIEW] POST /api/internal/review-one
        │       { jobId, question }
        │
        ├── INSERT into question_reviews (all 10 parameter results)
        │
        ├── IF overall_passed?
        │   YES → UPDATE questions SET review_status='passed',
        │                              is_user_visible=(userId IS NOT NULL),
        │                              review_attempts=attempt
        │         INSERT passed event (with question data + review results)
        │
        │   NO  → UPDATE questions SET review_status='failed',
        │                              review_attempts=attempt
        │         INSERT failed event
        │         IF attempt < 3:
        │           increment attempt
        │           set rewriteInstructions = reviewResult.rewrite_instructions
        │           INSERT rewriting event
        │           → retry generate with rewrite instructions
        │         ELSE:
        │           UPDATE questions SET review_status='discarded'
        │           INSERT discarded event
        │
  └── UPDATE generation_jobs SET status='completed',
                                  questions_passed=N,
                                  questions_discarded=N,
                                  completed_at=NOW()
      INSERT complete event
```

---

## Supabase API Calls in n8n

n8n uses direct REST API calls to Supabase (not the JS client).

### Base URL pattern:
```
https://<project-ref>.supabase.co/rest/v1/<table>
```

### Insert a question (draft):
```
POST https://<ref>.supabase.co/rest/v1/questions
Headers: apikey, Authorization, Content-Type: application/json, Prefer: return=representation
Body:
{
  "question": "...",
  "question_type": "multiple-choice",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A",
  "explanation": "...",
  "subject": "{{ $json.inputs.subject }}",
  "topic": "{{ $json.inputs.topic }}",
  "grade": "{{ $json.inputs.grade }}",
  "difficulty": "{{ $json.inputs.difficulty }}",
  "blooms_level": "{{ $json.inputs.bloomsLevel }}",
  "user_id": "{{ $json.userId }}",
  "is_public": false,
  "is_shared": false,
  "shared_with": null,
  "review_status": "pending",
  "is_user_visible": false,
  "review_attempts": 0,
  "parse_attempts": "{{ $json.parseAttempts }}",
  "question_source": "{{ $json.inputs.question_source || 'general' }}"
}
```

### Insert a question_reviews row:
```
POST https://<ref>.supabase.co/rest/v1/question_reviews
Body:
{
  "question_id": "{{ $json.questionId }}",
  "attempt": "{{ $json.attemptNumber }}",
  "p1_construct_validity": "{{ $json.reviewResult.p1.pass }}",
  "p1_feedback": "{{ $json.reviewResult.p1.feedback }}",
  ... (same for p2 through p10)
  "parameters_passed": "{{ $json.reviewResult.parameters_passed }}",
  "overall_passed": "{{ $json.reviewResult.overall_passed }}",
  "rewrite_prompt": "{{ $json.reviewResult.rewrite_instructions }}"
}
```

### Insert a job event:
```
POST https://<ref>.supabase.co/rest/v1/generation_job_events
Body:
{
  "job_id": "{{ $json.jobId }}",
  "question_index": "{{ $json.questionIndex }}",
  "event_type": "passed",
  "question_id": "{{ $json.questionId }}",
  "payload": { ... }
}
```

---

## Testing the Workflow

1. Start your local Next.js app: `npm run dev`
2. Use ngrok to expose localhost to n8n: `ngrok http 3000`
3. Update the internal API base URL in n8n nodes to your ngrok URL
4. Submit the form — check n8n execution logs for each step

---

## Production

When deployed to Vercel:
- Update n8n's internal API base URL to your Vercel production URL
- Add `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `INTERNAL_API_SECRET`
  to Vercel project environment variables
