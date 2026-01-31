"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuizGameConfig, QuizGameState, QuizQuestion } from '@/types/game';
import { GeneratedImage } from '@/types/question';
import { ClockIcon, FireIcon, CheckCircleIcon, XCircleIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { soundService } from '@/lib/soundService';
import ImageRenderer from '@/components/ImageRenderer';
import 'katex/dist/katex.min.css';

interface QuizGameTemplateProps {
  config: QuizGameConfig;
  onGameComplete: (results: GameResults) => void;
  onGameQuit?: (reason: string) => void;
}

export interface QuizAnswer {
  questionIndex: number;
  questionId?: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  timeTaken: number;
  pointsEarned: number;
}

export interface GameResults {
  timeElapsed: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  maxStreak: number;
  hintsUsed: number;
  answers: QuizAnswer[];
}

export default function QuizGameTemplate({ config, onGameComplete, onGameQuit }: QuizGameTemplateProps) {
  // Game state
  const [state, setState] = useState<QuizGameState>({
    current_question: 0,
    questions_answered: 0,
    correct_answers: 0,
    points: 0,
    time_elapsed: 0,
    streak: 0,
    hints_used: 0,
    answers: {}
  });

  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerProcessed, setAnswerProcessed] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(0);
  const [showHint, setShowHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [questionImages, setQuestionImages] = useState<{ [questionId: number]: GeneratedImage[] }>({});

  // Refs
  const gameStartTime = useRef<number>(Date.now());
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const questionTimerInterval = useRef<NodeJS.Timeout | null>(null);
  const maxStreakRef = useRef<number>(0);
  const stateRef = useRef(state);
  const [gameEnded, setGameEnded] = useState(false);
  const answerProcessedRef = useRef<boolean>(false); // Synchronous flag to prevent duplicate processing
  
  // Track answers for review
  const answersArrayRef = useRef<QuizAnswer[]>([]);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Current question (with safety check)
  const currentQuestion: QuizQuestion | undefined = config.questions[state.current_question];
  const isLastQuestion = state.current_question === config.questions.length - 1;


  // Timer and Initial Setup
  useEffect(() => {
    // Stop game start sound and start background music
    soundService.stopGameStart();
    soundService.startBackgroundMusic();
    
    // Load images for all questions that have question_id
    const loadAllImages = async () => {
      for (const question of config.questions) {
        if (question.question_id) {
          try {
            const response = await fetch(`/api/questions/${question.question_id}/images`);
            
            if (response.ok) {
              const result = await response.json();
              
              if (result.success && result.data) {
                setQuestionImages(prev => ({
                  ...prev,
                  [question.question_id!]: result.data
                }));
              }
            }
          } catch (error) {
            console.error(`Error loading images for question ${question.question_id}:`, error);
          }
        }
      }
    };
    
    loadAllImages();
    
    // Per-question timer setup
    const currentQuestionTimeLimit = currentQuestion?.time_limit || config.settings.time_limit;
    setQuestionTimeRemaining(currentQuestionTimeLimit);
    
    timerInterval.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        time_elapsed: Math.floor((Date.now() - gameStartTime.current) / 1000)
      }));
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (questionTimerInterval.current) {
        clearInterval(questionTimerInterval.current);
      }
      soundService.stopBackgroundMusic();
      soundService.stopGameEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run only once on mount (images loading is intentional)

  // Handle game end (declared first as it's used by handleNextQuestion and handleTimeExpired)
  const handleGameEnd = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Use stateRef to get the most current state (not stale closure)
    const currentState = stateRef.current;

    // Play game complete sound
    soundService.playGameComplete();
    soundService.stopBackgroundMusic();

    // Track max streak
    if (currentState.streak > maxStreakRef.current) {
      maxStreakRef.current = currentState.streak;
    }

    const results: GameResults = {
      totalQuestions: config.questions.length,
      correctAnswers: answersArrayRef.current.filter(a => a.isCorrect).length,
      score: currentState.points,
      timeElapsed: Math.floor((Date.now() - gameStartTime.current) / 1000),
      maxStreak: maxStreakRef.current,
      hintsUsed: currentState.hints_used,
      answers: answersArrayRef.current // Include answers for review
    };

    onGameComplete(results);
  }, [config.questions.length, onGameComplete]);

  // Handle next question (declared after handleGameEnd as it uses it)
  const handleNextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      current_question: prev.current_question + 1,
      questions_answered: prev.questions_answered + 1
    }));

    // Reset UI state
    setSelectedAnswer(null);
    setAnswerProcessed(false);
    answerProcessedRef.current = false; // Reset synchronous flag
    setShowExplanation(false);
    setIsAnswerCorrect(null);
    setQuestionStartTime(Date.now());
    setShowHint(false);

    // Reset per-question timer
    const nextQuestion = config.questions[state.current_question + 1];
    const nextTimeLimit = nextQuestion?.time_limit || config.settings.time_limit;
    setQuestionTimeRemaining(nextTimeLimit);

    // Check if game is complete
    if (isLastQuestion) {
      // Use setTimeout to allow state to update first
      setTimeout(() => {
        handleGameEnd();
      }, 50);
    }
  }, [isLastQuestion, handleGameEnd, config.questions, config.settings.time_limit, state.current_question]);

  // Handle time expired for current question (must be after handleNextQuestion and handleGameEnd)
  const handleTimeExpired = useCallback(() => {
    // Use ref for synchronous check to prevent race conditions
    if (answerProcessedRef.current || answerProcessed || gameEnded) return;
    
    // Set synchronous flag immediately to prevent duplicate calls
    answerProcessedRef.current = true;

    const timeTaken = (Date.now() - questionStartTime) / 1000;
    const currentState = stateRef.current; // Use ref to avoid stale closure

    // Mark as incorrect due to timeout
    const answerRecord = {
      questionIndex: currentState.current_question,
      questionId: currentQuestion?.question_id,
      question: currentQuestion!.question,
      userAnswer: '',
      correctAnswer: currentQuestion!.correct_answer,
      isCorrect: false,
      explanation: currentQuestion!.explanation || 'Time expired - no answer provided',
      timeTaken,
      pointsEarned: 0
    };

    // Save answer
    answersArrayRef.current.push(answerRecord);
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentState.current_question]: '' },
      streak: 0
    }));

    soundService.playIncorrect();

    setAnswerProcessed(true);

    // Auto-advance after brief delay
    setTimeout(() => {
      if (currentState.current_question < config.questions.length - 1) {
        handleNextQuestion();
      } else {
        setGameEnded(true);
        handleGameEnd();
      }
    }, 500);
  }, [answerProcessed, gameEnded, questionStartTime, currentQuestion, config, handleNextQuestion, handleGameEnd]);

  // Per-question timer - starts on each question
  useEffect(() => {
    if (!currentQuestion || answerProcessed || gameEnded) return;

    const currentQuestionTimeLimit = currentQuestion?.time_limit || config.settings.time_limit;
    
    if (questionTimerInterval.current) {
      clearInterval(questionTimerInterval.current);
    }

    setQuestionTimeRemaining(currentQuestionTimeLimit);

    questionTimerInterval.current = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        const newTime = prev - 1;

        // Play tick sound in last 5 seconds
        if (newTime <= 5 && newTime > 0) {
          soundService.playTick();
        }

        // Auto-advance when time expires
        if (newTime <= 0) {
          if (questionTimerInterval.current) {
            clearInterval(questionTimerInterval.current);
          }
          handleTimeExpired();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (questionTimerInterval.current) {
        clearInterval(questionTimerInterval.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.current_question, answerProcessed, gameEnded]);


  // Calculate points for an answer
  const calculatePoints = useCallback((timeTaken: number, isCorrect: boolean): number => {
    if (!isCorrect) return 0;

    const basePoints = currentQuestion.points || 100;
    
    // Dynamic speed bonus based on percentage of time used
    const questionTimeLimit = currentQuestion.time_limit || config.settings.time_limit;
    const timePercentage = (timeTaken / questionTimeLimit) * 100;
    
    let speedBonus = 0;
    if (timePercentage < 33) speedBonus = 50;      // Answered in first 1/3 of time
    else if (timePercentage < 50) speedBonus = 25; // Answered in first half of time

    // Streak multiplier (3+ streak: 1.5x, 5+ streak: 2x)
    let streakMultiplier = 1;
    if (state.streak >= 5) streakMultiplier = 2;
    else if (state.streak >= 3) streakMultiplier = 1.5;

    // Difficulty bonus
    let difficultyBonus = 0;
    if (currentQuestion.difficulty === 'hard') difficultyBonus = 50;
    else if (currentQuestion.difficulty === 'medium') difficultyBonus = 25;

    const totalPoints = Math.floor((basePoints + speedBonus + difficultyBonus) * streakMultiplier);
    return totalPoints;
  }, [currentQuestion, config.settings.time_limit, state.streak]);

  // Helper function to check FIB answer
  const checkFIBAnswer = useCallback((userAnswer: string, question: QuizQuestion): boolean => {
    const correct = question.correct_answer;
    const userAns = question.case_sensitive ? userAnswer : userAnswer.toLowerCase();
    const correctAns = question.case_sensitive ? correct : correct.toLowerCase();
    
    // Trim whitespace for comparison
    return userAns.trim() === correctAns.trim();
  }, []);

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: string) => {
    // Prevent re-processing if already answered (check both ref and state)
    if (answerProcessedRef.current || answerProcessed) return;
    
    // Set synchronous flag immediately
    answerProcessedRef.current = true;

    // Stop per-question timer
    if (questionTimerInterval.current) {
      clearInterval(questionTimerInterval.current);
    }

    setSelectedAnswer(answer);
    const timeTaken = (Date.now() - questionStartTime) / 1000; // Convert to seconds
    
    // Detect question type with fallback logic
    const questionType = currentQuestion.question_type;
    const isFIB = questionType === 'FIB' || 
                  (!currentQuestion.options || currentQuestion.options.length === 0) || 
                  currentQuestion.question.includes('______');
    const isTrueFalse = questionType === 'True/False' || 
                        (currentQuestion.options?.length === 2 && 
                         currentQuestion.options.some(o => o.toLowerCase().includes('true')));
    
    // Check answer based on detected question type
    let isCorrect: boolean;
    if (isFIB) {
      isCorrect = checkFIBAnswer(answer, currentQuestion);
    } else if (isTrueFalse) {
      // For True/False, direct comparison
      isCorrect = answer === currentQuestion.correct_answer;
    } else {
      // For MCQ, extract letter from option (e.g., "A) Some text" -> "A")
      const answerLetter = answer.trim().charAt(0);
      isCorrect = answerLetter === currentQuestion.correct_answer;
    }
    setIsAnswerCorrect(isCorrect);

    let pointsEarned = 0;

    if (isCorrect) {
      // Play correct sound
      soundService.playCorrect();
      
      // Correct answer
      const points = calculatePoints((Date.now() - questionStartTime), true);
      pointsEarned = points;
      const newStreak = state.streak + 1;
      
      // Play streak sound if streak is 2 or more
      if (newStreak >= 2) {
        setTimeout(() => soundService.playStreak(newStreak), 300);
      }
      
      // Play points sound
      setTimeout(() => soundService.playPoints(points), 500);
      
      // Update max streak
      if (newStreak > maxStreakRef.current) {
        maxStreakRef.current = newStreak;
      }
      
      setState(prev => ({
        ...prev,
        correct_answers: prev.correct_answers + 1,
        points: prev.points + points,
        streak: newStreak,
        answers: { ...prev.answers, [prev.current_question]: answer }
      }));
    } else {
      // Play incorrect sound
      soundService.playIncorrect();
      
      // Wrong answer - penalty
      pointsEarned = -25;
      
      setState(prev => ({
        ...prev,
        streak: 0,
        points: Math.max(0, prev.points - 25), // Penalty
        answers: { ...prev.answers, [prev.current_question]: answer }
      }));
    }

    // Store answer for review (without showing explanation during quiz)
    const answerRecord: QuizAnswer = {
      questionIndex: state.current_question,
      questionId: currentQuestion.question_id,
      question: currentQuestion.question,
      userAnswer: answer,
      correctAnswer: currentQuestion.correct_answer,
      isCorrect,
      explanation: currentQuestion.explanation || '',
      timeTaken,
      pointsEarned
    };
    answersArrayRef.current.push(answerRecord);

    // Mark answer as processed to prevent re-submission
    setAnswerProcessed(true);

    // Auto-advance after brief feedback (1.5 seconds)
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [answerProcessed, currentQuestion, questionStartTime, calculatePoints, handleNextQuestion, checkFIBAnswer, state.streak, state.current_question]);

  // Handle hint
  const handleShowHint = useCallback(() => {
    if (!config.settings.hints_enabled || !currentQuestion.hint) return;
    
    setShowHint(true);
    setState(prev => ({
      ...prev,
      hints_used: prev.hints_used + 1,
      points: Math.max(0, prev.points - 10) // Penalty for using hint
    }));
  }, [config.settings.hints_enabled, currentQuestion?.hint]);

  // Handle quit
  const handleQuit = useCallback(() => {
    if (onGameQuit) {
      onGameQuit('interrupted');
    }
    handleGameEnd();
  }, [onGameQuit, handleGameEnd]);

  // If game ended or no current question, show loading
  if (gameEnded || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Score */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏆</span>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{state.points}</div>
              </div>
            </div>


            {/* Streak */}
            {state.streak > 0 && (
              <div className="flex items-center gap-2">
                <FireIcon className="w-6 h-6 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Streak</div>
                  <div className="text-2xl font-bold text-orange-500">{state.streak}🔥</div>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Question {state.current_question + 1} of {config.questions.length}</span>
              <span>{Math.floor((state.questions_answered / config.questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(state.current_question / config.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* Difficulty badge */}
          <div className="flex items-center justify-between">
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
              ${currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : ''}
              ${currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
            `}>
              {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
            </span>

            <div className="flex items-center gap-3">
              {/* Sound toggle */}
              <button
                onClick={() => {
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  soundService.setMuted(newMuted);
                  soundService.playClick();
                }}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? (
                  <SpeakerXMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <SpeakerWaveIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>

              <button
                onClick={handleQuit}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
              >
                Quit Game
              </button>
            </div>
          </div>

          {/* Question Number and Timer */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Question {state.current_question + 1} of {config.questions.length}
              </span>
            </div>

            {/* Per-Question Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              questionTimeRemaining <= 10 
                ? 'bg-red-100 dark:bg-red-900/30' 
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <ClockIcon className={`w-5 h-5 ${
                questionTimeRemaining <= 10 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
              <span className={`text-xl font-bold ${
                questionTimeRemaining <= 10 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {questionTimeRemaining}s
              </span>
            </div>
          </div>

          {/* Question text */}
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ImageRenderer
              content={currentQuestion.question}
              questionId={currentQuestion.question_id}
              placementType="question"
              showPlaceholders={false}
              generatedImages={currentQuestion.question_id ? questionImages[currentQuestion.question_id] : []}
              className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed"
            />
          </div>

          {/* Hint button */}
          {config.settings.hints_enabled && currentQuestion.hint && !showHint && !selectedAnswer && (
            <button
              onClick={handleShowHint}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              💡 Show Hint (-10 points)
            </button>
          )}

          {/* Hint */}
          {showHint && currentQuestion.hint && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">Hint:</div>
                  <div className="prose dark:prose-invert max-w-none text-blue-700 dark:text-blue-400">
                    <ImageRenderer
                      content={currentQuestion.hint}
                      questionId={currentQuestion.question_id}
                      placementType="hint"
                      showPlaceholders={false}
                      generatedImages={currentQuestion.question_id ? questionImages[currentQuestion.question_id] : []}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Answer Input - Conditional based on question type */}
          {(() => {
            // Detect question type with fallback logic
            const questionType = currentQuestion.question_type;
            const isFIB = questionType === 'FIB' || 
                          (!currentQuestion.options || currentQuestion.options.length === 0) || 
                          currentQuestion.question.includes('______');
            const isTrueFalse = questionType === 'True/False' || 
                                (currentQuestion.options?.length === 2 && 
                                 currentQuestion.options.some(o => o.toLowerCase().includes('true')));

            if (isFIB) return 'FIB';
            if (isTrueFalse) return 'True/False';
            return 'MCQ';
          })() === 'FIB' ? (
            /* Fill in the Blank UI */
            <div className="space-y-4">
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Type your answer here..."
                disabled={showExplanation}
                className={`
                  w-full px-6 py-4 text-lg border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none
                  ${showExplanation 
                    ? (isAnswerCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      )
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }
                  dark:text-white
                `}
                autoFocus
              />
              <button
                onClick={() => handleAnswerSelect(selectedAnswer || '')}
                disabled={!selectedAnswer?.trim() || showExplanation}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-colors"
              >
                Submit Answer
              </button>
            </div>
          ) : (() => {
            const questionType = currentQuestion.question_type;
            const isFIB = questionType === 'FIB' || 
                          (!currentQuestion.options || currentQuestion.options.length === 0) || 
                          currentQuestion.question.includes('______');
            const isTrueFalse = questionType === 'True/False' || 
                                (currentQuestion.options?.length === 2 && 
                                 currentQuestion.options.some(o => o.toLowerCase().includes('true')));
            
            if (isFIB) return 'FIB';
            if (isTrueFalse) return 'True/False';
            return 'MCQ';
          })() === 'True/False' ? (
            /* True/False UI - 2 large buttons */
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = option === currentQuestion.correct_answer;
                const showCorrect = selectedAnswer !== null && isCorrectOption;
                const showWrong = isSelected && !isCorrectOption;

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      py-8 text-2xl font-bold rounded-xl border-2 transition-all duration-200
                      ${selectedAnswer === null 
                        ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                        : ''
                      }
                      ${showCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                        : ''
                      }
                      ${showWrong 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                        : ''
                      }
                      ${selectedAnswer !== null && !showCorrect && !showWrong 
                        ? 'border-gray-200 dark:border-gray-700 opacity-50' 
                        : ''
                      }
                      disabled:cursor-not-allowed
                      text-gray-900 dark:text-white
                    `}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {option}
                      {showCorrect && <CheckCircleIcon className="w-8 h-8 text-green-500" />}
                      {showWrong && <XCircleIcon className="w-8 h-8 text-red-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* MCQ UI - existing 4 option buttons */
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = selectedAnswer === option;
                // Extract letter from option for comparison (e.g., "A) Some text" -> "A")
                const optionLetter = option.trim().charAt(0);
                const isCorrectOption = optionLetter === currentQuestion.correct_answer;
                const showCorrect = selectedAnswer !== null && isCorrectOption;
                const showWrong = isSelected && !isCorrectOption;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${selectedAnswer === null 
                        ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                        : ''
                      }
                      ${showCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : ''
                      }
                      ${showWrong 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : ''
                      }
                      ${selectedAnswer !== null && !showCorrect && !showWrong 
                        ? 'border-gray-200 dark:border-gray-700 opacity-50' 
                        : ''
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 prose dark:prose-invert max-w-none">
                        <ImageRenderer
                          content={option}
                          questionId={currentQuestion.question_id}
                          placementType={`option_${optionLetter.toLowerCase()}`}
                          showPlaceholders={false}
                          generatedImages={currentQuestion.question_id ? questionImages[currentQuestion.question_id] : []}
                          className="text-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      {showCorrect && <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />}
                      {showWrong && <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Brief feedback - no explanation shown during quiz */}
          {answerProcessed && (
            <div className={`
              rounded-lg p-3 border-2 text-center font-semibold text-lg
              ${isAnswerCorrect 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300'
              }
            `}>
              {isAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
