# Timer Synchronization - Deep Investigation & Fix

## Root Cause Analysis

### Problem 1: Broadcast Timing
The `question_started` broadcast happens in the API `/start` action, but:
1. API sends broadcast via temporary channel (300ms delay)
2. Host hasn't even navigated to `/control` page yet
3. By the time host page loads and subscribes, the broadcast is long gone
4. Participants ARE subscribed (on waiting page), but their timer useEffect has issues

### Problem 2: Timer useEffect Dependencies
```typescript
useEffect(() => {
  // Timer countdown logic
}, [timeRemaining, hasAnswered]); // ❌ This is the problem!
```

When `timeRemaining` changes from 0 → 10 via broadcast:
- useEffect re-runs and creates a NEW interval
- But the OLD interval is still running
- Multiple intervals conflict with each other
- Timer gets "stuck" or counts down incorrectly

### Problem 3: Host Timer Initialization
Host was setting timer to 0, expecting broadcast. But:
- Broadcast already happened before host page loaded
- Host never receives the broadcast
- Timer stays at 0 forever

## Solution

### Fix 1: Remove timeRemaining from dependencies
The timer useEffect should NOT re-run when timeRemaining changes. It should only run ONCE when the component mounts or when hasAnswered changes.

### Fix 2: Host starts with correct timer
Instead of waiting for a broadcast that already happened, host should:
1. Load the correct timer from config on mount
2. Broadcast event can still update it if needed (for subsequent questions)

### Fix 3: Better broadcast reliability  
Increase delay to 500ms to ensure all clients receive it.

## Implementation

### File 1: participant/play/page.tsx
Change timer dependency to only trigger on hasAnswered change, not timeRemaining

### File 2: host/control/page.tsx  
Start with correct timer from config (not 0)

### File 3: liveQuizService.ts
Increase broadcast delay to 500ms

## Testing Strategy

After fix:
1. Start quiz
2. Check all 3 screens (host + 2 participants)
3. All should show same timer value
4. All should count down at same rate
5. Timer should stay synchronized for all questions
