"use client";

import { useState } from 'react';
import { QuestionRecord } from '@/lib/database';
import { User } from '@supabase/supabase-js';

interface QuizGameFormProps {
  existingQuestions?: QuestionRecord[];
  onSuccess?: (shareCode: string) => void;
  user?: User | null;
}

export default function QuizGameForm({ existingQuestions, onSuccess, user }: QuizGameFormProps) {
  const [mode, setMode] = useState<'generate' | 'convert'>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate mode state
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(300);
  const [enableImages, setEnableImages] = useState(false);
  
  // Question type distribution state
  const [numMcq, setNumMcq] = useState(10);
  const [numTrueFalse, setNumTrueFalse] = useState(0);
  const [numFib, setNumFib] = useState(0);

  // Convert mode state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [gameTitle, setGameTitle] = useState('');
  const [gameDescription, setGameDescription] = useState('');

  // Filter state for convert mode
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSubSubject, setFilterSubSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSubTopic, setFilterSubTopic] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterBloomsLevel, setFilterBloomsLevel] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');

  const grades = [
    'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 
    'Grade 12', 'Undergraduate', 'Graduate'
  ];

  const subjects = [
    'Mathematics', 'Science', 'English', 'Social Studies', 'History',
    'Geography', 'Computer Science', 'Physics', 'Chemistry', 'Biology',
    'Economics', 'Business', 'Other'
  ];

  const handleGenerateQuiz = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setError('Please enter a topic');
      return;
    }
    if (trimmedTopic.length < 2) {
      setError('Topic must be at least 2 characters long');
      return;
    }
    if (trimmedTopic.length > 100) {
      setError('Topic must not exceed 100 characters');
      return;
    }

    // Validate distribution
    const total = numMcq + numTrueFalse + numFib;
    if (total !== numberOfQuestions) {
      setError(`Question type distribution (${total}) must equal total number of questions (${numberOfQuestions})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/games/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject: subject || undefined,
          grade: grade || undefined,
          difficulty,
          numberOfQuestions,
          numMcq,
          numTrueFalse,
          numFib,
          timeLimit,
          enableImages,
          isPublic: true,
          allowAnonymousPlay: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      // Success - navigate to the play page
      if (onSuccess && data.shareCode) {
        onSuccess(data.shareCode);
      } else if (data.shareCode) {
        window.location.href = `/play/${data.shareCode}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertQuestions = async () => {
    if (selectedQuestions.size === 0) {
      setError('Please select at least one question');
      return;
    }

    const trimmedTitle = gameTitle.trim();
    if (!trimmedTitle) {
      setError('Please enter a game title');
      return;
    }
    if (trimmedTitle.length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }
    if (trimmedTitle.length > 200) {
      setError('Title must not exceed 200 characters');
      return;
    }

    const trimmedDescription = gameDescription.trim();
    if (trimmedDescription.length > 1000) {
      setError('Description must not exceed 1000 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter selected questions
      const questionsToConvert = existingQuestions?.filter(q => 
        q.id !== undefined && selectedQuestions.has(q.id)
      );

      if (!questionsToConvert || questionsToConvert.length === 0) {
        throw new Error('No valid questions selected');
      }

      // Transform QuestionRecord to GeneratedQuestion format for API
      const transformedQuestions = questionsToConvert.map(q => ({
        type: 'mcq',
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
        question_id: q.id // Pass original ID for image/content loading
      }));

      const response = await fetch('/api/games/convert-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gameTitle,
          description: gameDescription || undefined,
          questions: transformedQuestions,
          difficulty,
          timeLimit,
          isPublic: true,
          allowAnonymousPlay: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quiz game');
      }

      // Success - navigate to the play page
      if (onSuccess && data.shareCode) {
        onSuccess(data.shareCode);
      } else if (data.shareCode) {
        window.location.href = `/play/${data.shareCode}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz game');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelection = (questionId: number) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const selectAllQuestions = () => {
    if (existingQuestions) {
      const allIds = new Set(existingQuestions.map(q => q.id).filter((id): id is number => id !== undefined));
      setSelectedQuestions(allIds);
    }
  };

  const clearSelection = () => {
    setSelectedQuestions(new Set());
  };

  // Get filtered questions based on active filters
  const getFilteredQuestions = () => {
    if (!existingQuestions) return [];

    console.log('Total questions:', existingQuestions.length);
    console.log('Question types:', existingQuestions.map(q => q.question_type));
    
    // Quiz-compatible question types (case-insensitive)
    const quizSupportedTypes = [
      'mcq', 'multiple-choice', 'choice', 'MCQ', 'Multiple Choice',
      'true/false', 'true-false', 'True/False', 'T/F', 'TF',
      'fill in the blank', 'fill-in-the-blank', 'FIB', 'fib'
    ];
    return existingQuestions.filter(q => {
      // Check if question type is quiz-compatible
      const isQuizCompatible = q.question_type && quizSupportedTypes.some(
        t => t.toLowerCase() === String(q.question_type).toLowerCase()
      );
      console.log(`Question type "${q.question_type}" is quiz-compatible:`, isQuizCompatible);
      if (!isQuizCompatible) return false;

      // Apply filters
      if (filterSubject && q.subject !== filterSubject) return false;
      if (filterSubSubject && q.sub_subject !== filterSubSubject) return false;
      if (filterTopic && q.topic !== filterTopic) return false;
      if (filterSubTopic && q.sub_topic !== filterSubTopic) return false;
      if (filterGrade && q.grade !== filterGrade) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (filterBloomsLevel && q.blooms_level !== filterBloomsLevel) return false;
      
      // Question type filter - normalize both filter value and question type
      if (filterQuestionType) {
        const qType = String(q.question_type).toLowerCase();
        const filterType = filterQuestionType.toLowerCase();
        
        if (filterType === 'mcq') {
          const isMcq = qType.includes('mcq') || qType.includes('multiple') || qType.includes('choice');
          if (!isMcq) return false;
        } else if (filterType === 'true/false') {
          const isTrueFalse = qType.includes('true') || qType.includes('false') || qType === 't/f';
          if (!isTrueFalse) return false;
        } else if (filterType === 'fib') {
          const isFib = qType.includes('fill') || qType === 'fib';
          if (!isFib) return false;
        }
      }

      return true;
    });
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field: keyof QuestionRecord) => {
    if (!existingQuestions) return [];
    const values = existingQuestions
      .map(q => q[field])
      .filter((v): v is string => v !== null && v !== undefined && v !== '');
    return Array.from(new Set(values)).sort();
  };

  const filteredQuestions = getFilteredQuestions();

  // Early return for anonymous users - show sign-in encouragement
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Sign In to Create Quiz Games
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Create an account to unlock all features
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Create Interactive Quiz Games</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Generate AI-powered quizzes and share them with students or friends</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Save Your Questions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All your created questions and quizzes are saved and accessible anytime</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Track Performance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor quiz plays, scores, and engagement with detailed analytics</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Convert Saved Questions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transform your question library into engaging quiz games instantly</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                const signInButton = document.querySelector('[aria-label="Sign In or Sign Up"]') as HTMLButtonElement;
                if (signInButton) signInButton.click();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all text-center cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                const signInButton = document.querySelector('[aria-label="Sign In or Sign Up"]') as HTMLButtonElement;
                if (signInButton) signInButton.click();
              }}
              className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold rounded-lg transition-all text-center cursor-pointer"
            >
              Create Account
            </button>
          </div>

          {/* Additional info */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have questions? <a href="/create-questions" className="text-blue-600 dark:text-blue-400 hover:underline">Create questions first</a> then sign in to convert them to quizzes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Create Quiz Game
      </h2>

      {/* Info message when no existing questions */}
      {existingQuestions && existingQuestions.length === 0 && (
        <div className="mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              💡 <strong>Tip:</strong> You can also convert your saved questions into quiz games! 
              Go to <a href="/create-questions" className="underline font-medium">Create Questions</a> to generate and save questions first, 
              then come back here to see the &quot;Convert Existing Questions&quot; option.
            </p>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      {existingQuestions && existingQuestions.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Creation Mode
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setMode('generate')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'generate'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Generate New Quiz
            </button>
            <button
              onClick={() => setMode('convert')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'convert'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Convert Existing Questions ({existingQuestions.length})
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Generate Mode */}
      {mode === 'generate' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, World War II, Quadratic Equations"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className={`text-xs mt-1 ${
              topic.length > 100 ? 'text-red-600 dark:text-red-400' : 
              topic.length < 2 && topic.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-gray-500 dark:text-gray-400'
            }`}>
              {topic.length}/100 characters {topic.length < 2 && topic.length > 0 ? '(minimum 2)' : ''} {topic.length > 100 ? '(exceeds limit)' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Subject</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Level
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Grade</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Questions
              </label>
              <input
                type="number"
                min="5"
                max="20"
                value={numberOfQuestions}
                onChange={(e) => {
                  const newTotal = parseInt(e.target.value) || 10;
                  setNumberOfQuestions(newTotal);
                  // Auto-adjust distribution to maintain total
                  const currentTotal = numMcq + numTrueFalse + numFib;
                  if (currentTotal !== newTotal) {
                    // Reset to all MCQ when total changes
                    setNumMcq(newTotal);
                    setNumTrueFalse(0);
                    setNumFib(0);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Limit (sec)
              </label>
              <input
                type="number"
                min="60"
                max="1800"
                step="30"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 300)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableImages"
              checked={enableImages}
              onChange={(e) => setEnableImages(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="enableImages" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable AI-generated images (slower generation)
            </label>
          </div>

          {/* Question Type Distribution */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Question Type Distribution
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">MCQ</label>
                <input
                  type="number"
                  min="0"
                  max={numberOfQuestions}
                  value={numMcq}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(numberOfQuestions, parseInt(e.target.value) || 0));
                    setNumMcq(val);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">True/False</label>
                <input
                  type="number"
                  min="0"
                  max={numberOfQuestions}
                  value={numTrueFalse}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(numberOfQuestions, parseInt(e.target.value) || 0));
                    setNumTrueFalse(val);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Fill in Blank</label>
                <input
                  type="number"
                  min="0"
                  max={numberOfQuestions}
                  value={numFib}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(numberOfQuestions, parseInt(e.target.value) || 0));
                    setNumFib(val);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center"
                />
              </div>
            </div>
            
            {/* Validation message */}
            {(numMcq + numTrueFalse + numFib) !== numberOfQuestions && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Total must equal {numberOfQuestions}. Current: {numMcq + numTrueFalse + numFib}
              </p>
            )}
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Total: {numMcq + numTrueFalse + numFib} of {numberOfQuestions} questions
            </p>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={loading || !topic.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Generating Quiz...' : 'Generate Quiz Game'}
          </button>
        </div>
      )}

      {/* Convert Mode */}
      {mode === 'convert' && existingQuestions && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Game Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="e.g., Science Quiz Challenge"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className={`text-xs mt-1 ${
              gameTitle.length > 200 ? 'text-red-600 dark:text-red-400' : 
              gameTitle.length < 3 && gameTitle.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-gray-500 dark:text-gray-400'
            }`}>
              {gameTitle.length}/200 characters {gameTitle.length < 3 && gameTitle.length > 0 ? '(minimum 3)' : ''} {gameTitle.length > 200 ? '(exceeds limit)' : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Game Description
            </label>
            <textarea
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              placeholder="Brief description of your quiz game"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className={`text-xs mt-1 ${
              gameDescription.length > 1000 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-500 dark:text-gray-400'
            }`}>
              {gameDescription.length}/1000 characters {gameDescription.length > 1000 ? '(exceeds limit)' : ''}
            </p>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📊 Filter Questions
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All Subjects</option>
                  {getUniqueValues('subject').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sub-Subject</label>
                <select value={filterSubSubject} onChange={(e) => setFilterSubSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All</option>
                  {getUniqueValues('sub_subject').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic</label>
                <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All Topics</option>
                  {getUniqueValues('topic').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sub-Topic</label>
                <select value={filterSubTopic} onChange={(e) => setFilterSubTopic(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All</option>
                  {getUniqueValues('sub_topic').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grade</label>
                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All Grades</option>
                  {getUniqueValues('grade').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bloom&apos;s Level</label>
                <select value={filterBloomsLevel} onChange={(e) => setFilterBloomsLevel(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">All Levels</option>
                  {getUniqueValues('blooms_level').map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select 
                  value={filterQuestionType} 
                  onChange={(e) => setFilterQuestionType(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="mcq">MCQ</option>
                  <option value="true/false">True/False</option>
                  <option value="fib">FIB</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                📝 Showing <strong>{filteredQuestions.length}</strong> of {existingQuestions?.filter(q => {
                  const quizSupportedTypes = [
                    'mcq', 'multiple-choice', 'choice', 'MCQ', 'Multiple Choice',
                    'true/false', 'true-false', 'True/False', 'T/F', 'TF',
                    'fill in the blank', 'fill-in-the-blank', 'FIB', 'fib'
                  ];
                  return q.question_type && quizSupportedTypes.some(t => t.toLowerCase() === String(q.question_type).toLowerCase());
                }).length || 0} quiz questions
              </span>
              {(filterSubject || filterSubSubject || filterTopic || filterSubTopic || 
                filterGrade || filterDifficulty || filterBloomsLevel || filterQuestionType) && (
                <button
                  onClick={() => {
                    setFilterSubject(''); setFilterSubSubject(''); setFilterTopic('');
                    setFilterSubTopic(''); setFilterGrade(''); setFilterDifficulty(''); 
                    setFilterBloomsLevel(''); setFilterQuestionType('');
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  ✕ Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Limit (sec)
              </label>
              <input
                type="number"
                min="60"
                max="1800"
                step="30"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 300)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Questions ({selectedQuestions.size} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllQuestions}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {existingQuestions?.filter(q => {
                    const quizSupportedTypes = [
                      'mcq', 'multiple-choice', 'choice', 'MCQ', 'Multiple Choice',
                      'true/false', 'true-false', 'True/False', 'T/F', 'TF',
                      'fill in the blank', 'fill-in-the-blank', 'FIB', 'fib'
                    ];
                    return q.question_type && quizSupportedTypes.some(t => t.toLowerCase() === String(q.question_type).toLowerCase());
                  }).length === 0
                    ? 'No quiz-compatible questions available. Only MCQ, True/False, and Fill in the Blank questions can be used in quiz games.'
                    : 'No questions match your filters. Try adjusting the filters above.'}
                </p>
              ) : (
                filteredQuestions.map((question) => {
                  if (!question.id) return null;
                  const isSelected = selectedQuestions.has(question.id);
                  return (
                    <label
                      key={question.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => question.id && toggleQuestionSelection(question.id)}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">
                          {question.question}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {question.subject && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {question.subject}
                            </span>
                          )}
                          {question.topic && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                              {question.topic}
                            </span>
                          )}
                          {question.grade && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                              {question.grade}
                            </span>
                          )}
                          {question.difficulty && (
                            <span className={`px-2 py-0.5 rounded ${
                              question.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {question.difficulty}
                            </span>
                          )}
                          {question.blooms_level && (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                              {question.blooms_level}
                            </span>
                          )}
                          {question.question_type && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium">
                              {(() => {
                                const type = question.question_type.toLowerCase();
                                if (type.includes('true') || type.includes('false') || type === 't/f') {
                                  return 'True/False';
                                } else if (type.includes('fill') || type === 'fib') {
                                  return 'FIB';
                                } else if (type.includes('mcq') || type.includes('multiple') || type.includes('choice')) {
                                  return 'MCQ';
                                } else {
                                  return question.question_type;
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={handleConvertQuestions}
            disabled={loading || selectedQuestions.size === 0 || !gameTitle.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creating Quiz Game...' : 'Create Quiz Game'}
          </button>
        </div>
      )}
    </div>
  );
}
