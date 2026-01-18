"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuizGameConfig, QuizGameState, QuizQuestion } from '@/types/game';
import { GeneratedImage } from '@/types/question';
import { ClockIcon, HeartIcon, FireIcon, CheckCircleIcon, XCircleIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { soundService } from '@/lib/soundService';
import ImageRenderer from '@/components/ImageRenderer';
import 'katex/dist/katex.min.css';

interface QuizGameTemplateProps {
  config: QuizGameConfig;
  onGameComplete: (results: GameResults) => void;
  onGameQuit?: (reason: string) => void;
}

export interface GameResults {
  timeElapsed: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  maxStreak: number;
  hintsUsed: number;
  livesRemaining: number;
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
    lives_remaining: config.settings.lives,
    hints_used: 0,
    answers: {}
  });

  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [questionImages, setQuestionImages] = useState<{ [questionId: number]: GeneratedImage[] }>({});

  // Refs
  const gameStartTime = useRef<number>(Date.now());
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const maxStreakRef = useRef<number>(0);
  const stateRef = useRef(state);
  const [gameEnded, setGameEnded] = useState(false);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Current question (with safety check)
  const currentQuestion: QuizQuestion | undefined = config.questions[state.current_question];
  const isLastQuestion = state.current_question === config.questions.length - 1;

  // Debug: Log questionImages state and current question images
  useEffect(() => {
    console.log('🎯 Current question ID:', currentQuestion?.question_id);
    console.log('📚 All loaded images:', questionImages);
    if (currentQuestion?.question_id) {
      console.log(`🖼️ Images for current question ${currentQuestion.question_id}:`, 
        questionImages[currentQuestion.question_id] || 'NONE');
    }
  }, [currentQuestion?.question_id, questionImages]);

  // Timer and Initial Setup
  useEffect(() => {
    // Stop game start sound and start background music
    soundService.stopGameStart();
    soundService.startBackgroundMusic();
    
    // Load images for all questions that have question_id
    const loadAllImages = async () => {
      console.log('🖼️ Starting to load images for quiz questions...');
      console.log('📝 Total questions:', config.questions.length);
      
      for (const question of config.questions) {
        console.log(`🔍 Checking question:`, { 
          hasQuestionId: !!question.question_id, 
          questionId: question.question_id,
          questionText: question.question.substring(0, 50) + '...'
        });
        
        if (question.question_id) {
          try {
            console.log(`📡 Fetching images for question ID: ${question.question_id}`);
            const response = await fetch(`/api/questions/${question.question_id}/images`);
            console.log(`📥 Response status:`, response.status);
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Image API result:`, result);
              
              if (result.success && result.data) {
                console.log(`🎨 Loaded ${result.data.length} images for question ${question.question_id}`);
                setQuestionImages(prev => ({
                  ...prev,
                  [question.question_id!]: result.data
                }));
              } else {
                console.log(`⚠️ No image data in response for question ${question.question_id}`);
              }
            } else {
              console.warn(`❌ Failed to fetch images for question ${question.question_id}: ${response.status}`);
            }
          } catch (error) {
            console.error(`❌ Error loading images for question ${question.question_id}:`, error);
          }
        }
      }
      console.log('🏁 Finished loading images');
    };
    
    loadAllImages();
    
    timerInterval.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        time_elapsed: Math.floor((Date.now() - gameStartTime.current) / 1000)
      }));
      
      // Play tick sound in last 10 seconds
      const timeLeft = config.settings.time_limit - Math.floor((Date.now() - gameStartTime.current) / 1000);
      if (timeLeft <= 10 && timeLeft > 0) {
        soundService.playTick();
      }
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      soundService.stopBackgroundMusic();
      soundService.stopGameEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run only once on mount (images loading is intentional)

  // Check if time limit exceeded
  useEffect(() => {
    if (config.settings.time_limit && state.time_elapsed >= config.settings.time_limit) {
      handleGameEnd(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.time_elapsed, config.settings.time_limit]);

  // Check if lives depleted
  useEffect(() => {
    if (state.lives_remaining <= 0) {
      handleGameEnd(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lives_remaining]);

  // Calculate points for an answer
  const calculatePoints = useCallback((timeTaken: number, isCorrect: boolean): number => {
    if (!isCorrect) return 0;

    const basePoints = currentQuestion.points || 100;
    
    // Speed bonus (answer within 5 seconds: +50, within 10 seconds: +25)
    let speedBonus = 0;
    if (timeTaken < 5000) speedBonus = 50;
    else if (timeTaken < 10000) speedBonus = 25;

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
  }, [currentQuestion, state.streak]);

  // Handle game end (defined before other handlers to avoid reference errors)
  const handleGameEnd = useCallback((completed: boolean) => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Use stateRef to get the most current state (not stale closure)
    const currentState = stateRef.current;

    // Play game complete sound
    const won = completed && currentState.correct_answers >= config.questions.length / 2;
    soundService.playGameComplete(won);
    soundService.stopBackgroundMusic();

    // Mark game as ended to prevent further rendering
    setGameEnded(true);

    const results: GameResults = {
      timeElapsed: Date.now() - gameStartTime.current,
      score: currentState.points, // Use current state from ref
      correctAnswers: currentState.correct_answers,
      totalQuestions: config.questions.length,
      maxStreak: maxStreakRef.current,
      hintsUsed: currentState.hints_used,
      livesRemaining: currentState.lives_remaining
    };

    onGameComplete(results);
  }, [config.questions.length, onGameComplete]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      current_question: prev.current_question + 1,
      questions_answered: prev.questions_answered + 1
    }));

    // Reset UI state
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsAnswerCorrect(null);
    setQuestionStartTime(Date.now());
    setShowHint(false);

    // Check if game is complete
    if (isLastQuestion) {
      // Use setTimeout to allow state to update first
      setTimeout(() => {
        handleGameEnd(true);
      }, 50);
    }
  }, [isLastQuestion, handleGameEnd]);

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
    // For MCQ/True-False: prevent re-selection if already answered
    // For FIB: only prevent if explanation is showing (answer has been submitted)
    if (showExplanation) return; // Already answered and showing explanation

    setSelectedAnswer(answer);
    const timeTaken = Date.now() - questionStartTime;
    
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

    if (isCorrect) {
      // Play correct sound
      soundService.playCorrect();
      
      // Correct answer
      const points = calculatePoints(timeTaken, true);
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
      
      // Wrong answer
      setState(prev => ({
        ...prev,
        lives_remaining: prev.lives_remaining - 1,
        streak: 0,
        points: Math.max(0, prev.points - 25), // Penalty
        answers: { ...prev.answers, [prev.current_question]: answer }
      }));
    }

    // Show explanation if enabled
    if (config.settings.show_explanations) {
      setShowExplanation(true);
    } else {
      // Auto-advance after 1 second
      setTimeout(() => {
        handleNextQuestion();
      }, 1000);
    }
  }, [showExplanation, currentQuestion, questionStartTime, calculatePoints, config.settings.show_explanations, handleNextQuestion, checkFIBAnswer, state.streak]);

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
    handleGameEnd(false);
  }, [onGameQuit, handleGameEnd]);

  // Remaining time
  const remainingTime = config.settings.time_limit 
    ? config.settings.time_limit - state.time_elapsed 
    : null;

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

            {/* Timer */}
            {remainingTime !== null && (
              <div className="flex items-center gap-2">
                <ClockIcon className={`w-6 h-6 ${remainingTime < 30 ? 'text-red-500' : 'text-blue-500'}`} />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Time</div>
                  <div className={`text-2xl font-bold ${remainingTime < 30 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}

            {/* Lives */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: config.settings.lives }).map((_, i) => (
                  i < state.lives_remaining ? (
                    <HeartSolidIcon key={i} className="w-6 h-6 text-red-500" />
                  ) : (
                    <HeartIcon key={i} className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  )
                ))}
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
            
            console.log('🎯 Question type detection:', {
              questionType,
              hasOptions: !!currentQuestion.options,
              optionsLength: currentQuestion.options?.length,
              hasBlank: currentQuestion.question.includes('______'),
              isFIB,
              isTrueFalse
            });

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

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation && (
            <div className={`
              rounded-lg p-4 border-2
              ${isAnswerCorrect 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }
            `}>
              <div className="flex items-start gap-2">
                {isAnswerCorrect ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`font-medium mb-1 ${isAnswerCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                    {isAnswerCorrect ? 'Correct! ✨' : 'Incorrect'}
                  </div>
                  <div className={`prose dark:prose-invert max-w-none ${isAnswerCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    <ImageRenderer
                      content={currentQuestion.explanation}
                      questionId={currentQuestion.question_id}
                      placementType="explanation"
                      showPlaceholders={false}                      generatedImages={currentQuestion.question_id ? questionImages[currentQuestion.question_id] : []}                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next button */}
          {showExplanation && (
            <button
              onClick={handleNextQuestion}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLastQuestion ? 'Finish Game' : 'Next Question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
