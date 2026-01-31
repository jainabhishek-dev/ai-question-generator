'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit3, Check, Clock } from 'lucide-react';
import Portal from '@/components/Portal';
import { Game, UpdateGameRequest, QuizGameConfig, QuizQuestion } from '@/types/game';
import ImageRenderer from '@/components/ImageRenderer';

interface EditGameModalProps {
  game: Game;
  onClose: () => void;
  onSave: (gameId: string, updates: UpdateGameRequest) => Promise<void>;
}

type TabType = 'basic' | 'questions' | 'settings';

export default function EditGameModal({ game, onClose, onSave }: EditGameModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description || '');
  const [subject, setSubject] = useState(game.subject || '');
  const [difficulty, setDifficulty] = useState(game.difficulty);
  const [topic, setTopic] = useState(game.topic || '');
  
  // Questions state
  const quizConfig = game.config as QuizGameConfig;
  const [questions, setQuestions] = useState<QuizQuestion[]>(quizConfig.questions || []);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  
  // Settings state
  const [timeLimit, setTimeLimit] = useState(quizConfig.settings?.time_limit || 30);
  const [hintsEnabled, setHintsEnabled] = useState(quizConfig.settings?.hints_enabled || false);
  const [showExplanations, setShowExplanations] = useState(quizConfig.settings?.show_explanations !== false);

  // Track changes
  useEffect(() => {
    const hasChanges = 
      title !== game.title ||
      description !== (game.description || '') ||
      subject !== (game.subject || '') ||
      difficulty !== game.difficulty ||
      topic !== (game.topic || '') ||
      JSON.stringify(questions) !== JSON.stringify(quizConfig.questions) ||
      timeLimit !== quizConfig.settings?.time_limit ||
      hintsEnabled !== quizConfig.settings?.hints_enabled ||
      showExplanations !== quizConfig.settings?.show_explanations;
    
    setIsDirty(hasChanges);
  }, [title, description, subject, difficulty, topic, questions, timeLimit, hintsEnabled, showExplanations, game, quizConfig]);

  // Validation
  const validateForm = (): string | null => {
    if (!title.trim() || title.length < 3 || title.length > 200) {
      return 'Title must be between 3 and 200 characters';
    }
    if (description.length > 1000) {
      return 'Description must be less than 1000 characters';
    }
    if (questions.length === 0) {
      return 'At least one question is required';
    }
    if (timeLimit < 5 || timeLimit > 180) {
      return 'Time per question must be between 5 and 180 seconds';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates: UpdateGameRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim() || undefined,
        difficulty,
        topic: topic.trim() || undefined,
        config: {
          questions,
          settings: {
            time_limit: timeLimit,
            hints_enabled: hintsEnabled,
            show_explanations: showExplanations
          }
        }
      };

      await onSave(game.id, updates);
      setIsDirty(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      setError('Cannot remove the last question. At least one question is required.');
      return;
    }
    const confirm = window.confirm('Are you sure you want to remove this question?');
    if (confirm) {
      setQuestions(questions.filter((_, i) => i !== index));
      setError(null);
    }
  };

  const handleEditQuestion = (index: number, field: keyof QuizQuestion, value: string | number | boolean | string[] | undefined) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleEditOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const options = [...(newQuestions[questionIndex].options || [])];
    options[optionIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options };
    setQuestions(newQuestions);
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Edit Quiz Game
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Modify your quiz settings, questions, and content
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
            <nav className="flex px-4 sm:px-6 space-x-4 sm:space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'questions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Questions ({questions.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'basic' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quiz title"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {title.length}/200 characters
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter quiz description"
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {description.length}/1000 characters
                  </p>
                </div>

                {/* Subject and Topic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Algebra"
                    />
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No questions yet</p>
                  </div>
                ) : (
                  questions.map((q, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                            {index + 1}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                            {q.question_type || 'MCQ'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => setEditingQuestionIndex(editingQuestionIndex === index ? null : index)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            {editingQuestionIndex === index ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(index)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingQuestionIndex === index ? (
                        <div className="space-y-3">
                          <textarea
                            value={q.question}
                            onChange={(e) => handleEditQuestion(index, 'question', e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                            rows={3}
                            placeholder="Question text"
                          />
                          
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Options:</label>
                              {q.options.map((opt, optIndex) => (
                                <input
                                  key={optIndex}
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleEditOption(index, optIndex, e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                />
                              ))}
                            </div>
                          )}

                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) => handleEditQuestion(index, 'correct_answer', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-gray-100"
                            placeholder="Correct answer"
                          />

                          <textarea
                            value={q.explanation}
                            onChange={(e) => handleEditQuestion(index, 'explanation', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                            rows={2}
                            placeholder="Explanation"
                          />

                          {/* Time Limit for this question */}
                          <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Time Limit (seconds):
                            </label>
                            <input
                              type="number"
                              min="5"
                              max="180"
                              step="5"
                              value={q.time_limit || timeLimit}
                              onChange={(e) => handleEditQuestion(index, 'time_limit', parseInt(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder={`Default: ${timeLimit}s`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                            <ImageRenderer 
                              content={q.question}
                              showPlaceholders={false}
                              className="prose-sm dark:prose-invert"
                            />
                          </div>
                          
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-1">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="text-xs text-gray-600 dark:text-gray-400 pl-4">
                                  {String.fromCharCode(65 + optIndex)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            ✓ {q.correct_answer}
                          </div>
                          
                          {/* Show time limit in display mode */}
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{q.time_limit || timeLimit}s</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Time Per Question */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Time Per Question: {timeLimit} seconds
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>5 sec</span>
                    <span>180 sec (3 min)</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Each question will have this time limit by default. You can customize individual questions below.
                  </p>
                </div>

                {/* Hints Enabled */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Hints
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Allow players to use hints during the quiz
                    </p>
                  </div>
                  <button
                    onClick={() => setHintsEnabled(!hintsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      hintsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        hintsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Explanations */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Show Explanations
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Display explanations after each question
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExplanations(!showExplanations)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showExplanations ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showExplanations ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
            <div>
              {isDirty && (
                <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                  You have unsaved changes
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={handleClose}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !isDirty}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
