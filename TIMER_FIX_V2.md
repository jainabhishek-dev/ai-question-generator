# Timer Fix - Proper Solution

## The Problem

My previous fix removed `timeRemaining` from dependencies, which caused a new problem:
- When `timeRemaining` is initially 0 (before data loads)
- useEffect runs and hits the early return: `if (timeRemaining <= 0) return`
- Then when `timeRemaining` changes to 10 (after data loads)
- useEffect doesn't re-run (because `timeRemaining` not in dependencies)
- Timer never starts!

## The Correct Solution

Use a **timerKey** state that only increments when a NEW question starts:

```typescript
const [timerKey, setTimerKey] = useState(0);

// Detect question changes
useEffect(() => {
  if (timeRemaining > 0) {
    setTimerKey(prev => prev + 1); // Increment key to restart timer
  }
}, [session?.current_question_index]); // Only trigger on question change

// Timer countdown
useEffect(() => {
  if (timeRemaining <= 0 || hasAnswered) return;
  
  const timer = setInterval(() => {
    setTimeRemaining(prev => prev - 1);
  }, 1000);
  
  return () => clearInterval(timer);
}, [timerKey, hasAnswered]); // Only re-run on new question or answer
```

**Why This Works:**
1. Timer useEffect depends on `timerKey`, not `timeRemaining`
2. `timerKey` only changes when `current_question_index` changes (new question)
3. Timer interval runs continuously without recreation
4. Uses `prev =>` callback to avoid stale state
5. No unnecessary re-renders

**Flow:**
1. Component mounts → timerKey = 0
2. Data loads → timeRemaining = 10 → timerKey = 1 (triggers timer start)
3. Timer counts down 10 → 9 → 8... (timerKey stays 1, no re-creation)
4. Next question → current_question_index changes → timerKey = 2 (restarts timer)

## Restart Required

⚠️ **Restart the dev server:**
```bash
Ctrl+C
npm run dev
```

Then test - timer should start and count down smoothly on all screens!
