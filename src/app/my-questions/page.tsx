"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
// Import your types and helpers as needed
import { QuestionRecord } from "@/types/question";
import { getUserQuestions, softDeleteUserQuestion } from "@/lib/database";
  // Delete question handler
  async function handleDelete(questionId: number) {
    if (!user || !questionId) return;
    setDeletingId(questionId);
    setError(null);
    try {
      const res = await softDeleteUserQuestion(questionId, user.id);
      if (!res.success) {
        setError(res.error || "Failed to delete question.");
      } else {
        // Remove deleted question from state
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        setShowDeleteModal(false);
        setPendingDeleteId(null);
      }
    } catch (err: any) {
      setError("Failed to delete question: " + (err.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  }
// import { ALL_TYPE_OPTIONS, ALL_GRADE_OPTIONS, ALL_DIFFICULTY_OPTIONS, ALL_BLOOMS_OPTIONS } from "@/lib/constants";

export default function MyQuestionsPage() {
  // ...existing code...
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states (actual applied)
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [bloomsFilter, setBloomsFilter] = useState<string>("");

  // Local filter states (for dropdowns)
  const [typeDraft, setTypeDraft] = useState<string>("");
  const [gradeDraft, setGradeDraft] = useState<string>("");
  const [difficultyDraft, setDifficultyDraft] = useState<string>("");
  const [bloomsDraft, setBloomsDraft] = useState<string>("");

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Selection state for checkboxes
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filtering logic
  const filteredQuestions = questions.filter(q => {
    return (
      (!typeFilter || q.question_type === typeFilter) &&
      (!gradeFilter || q.grade === gradeFilter) &&
      (!difficultyFilter || q.difficulty === difficultyFilter) &&
      (!bloomsFilter || q.blooms_level === bloomsFilter)
    );
  });

  // Whether all filtered questions are selected
  const isAllSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => q.id && selectedIds.includes(q.id));

  // Toggle select all
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id!).filter(Boolean));
    }
  };

  // Toggle individual selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getUserQuestions(user.id, { limit: 50 })
      .then((res) => {
        if (res.success && res.data) {
          setQuestions(res.data);
        } else {
          setError(res.error || "Failed to fetch questions.");
        }
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setIsLoading(false));
  }, [user]);

  // Use all possible options for dropdowns
  // Example options, replace with your actual options or import from constants
  const typeOptions = ["multiple-choice", "fill-in-the-blank", "short-answer", "long-answer"];
  const gradeOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const difficultyOptions = ["easy", "medium", "hard"];
  const bloomsOptions = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

  // Delete question handler
  async function handleDelete(questionId: number) {
    if (!user || !questionId) return;
    setDeletingId(questionId);
    setError(null);
    try {
      const res = await softDeleteUserQuestion(questionId, user.id);
      if (!res.success) {
        setError(res.error || "Failed to delete question.");
      } else {
        // Remove deleted question from state
        setQuestions(prev => prev.filter((q: QuestionRecord) => q.id !== questionId));
        setShowDeleteModal(false);
        setPendingDeleteId(null);
      }
    } catch (err: any) {
      setError("Failed to delete question: " + (err.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  }

  // Export as Worksheet (questions only)
  async function handleExportWorksheet(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    setError(null);
    const exportQuestions = selectedIds.length > 0
      ? filteredQuestions.filter(q => q.id && selectedIds.includes(q.id))
      : filteredQuestions;
    if (exportQuestions.length === 0) {
      setError("No questions to export.");
      return;
    }
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: exportQuestions,
          exportType: "worksheet",
          preferences: {
            formatting: { fontSize: 14, showHeaders: true, showFooters: true },
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to export PDF");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "worksheet.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Failed to export Worksheet: " + (err.message || "Unknown error"));
    }
  }

  // Export as Answer Key (questions + answers)
  async function handleExportAnswerKey(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    setError(null);
    const exportQuestions = selectedIds.length > 0
      ? filteredQuestions.filter(q => q.id && selectedIds.includes(q.id))
      : filteredQuestions;
    if (exportQuestions.length === 0) {
      setError("No questions to export.");
      return;
    }
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: exportQuestions,
          exportType: "answer-key",
          preferences: {
            formatting: { fontSize: 14, showHeaders: true, showFooters: true },
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to export PDF");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "answer-key.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Failed to export Answer Key: " + (err.message || "Unknown error"));
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-t-lg shadow-sm border-b">
          <div>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="mr-2 accent-blue-600"
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-gray-800 font-medium">Select All</label>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Type:</label>
            <select value={typeDraft} onChange={e => setTypeDraft(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {typeOptions.map(type => (
                <option key={type} value={type}>{type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Grade:</label>
            <select value={gradeDraft} onChange={e => setGradeDraft(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {gradeOptions.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Difficulty:</label>
            <select value={difficultyDraft} onChange={e => setDifficultyDraft(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {difficultyOptions.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Bloom's:</label>
            <select value={bloomsDraft} onChange={e => setBloomsDraft(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {bloomsOptions.map(bloom => (
                <option key={bloom} value={bloom}>{bloom}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setTypeFilter(typeDraft);
              setGradeFilter(gradeDraft);
              setDifficultyFilter(difficultyDraft);
              setBloomsFilter(bloomsDraft);
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
        {/* Export Buttons */}
        <div className="flex gap-4 items-center bg-white p-4 rounded-b-lg shadow-sm border-t justify-end">
          <button
            onClick={handleExportWorksheet}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={filteredQuestions.length === 0}
          >
            Export Worksheet
          </button>
          <button
            onClick={handleExportAnswerKey}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            disabled={filteredQuestions.length === 0}
          >
            Export Answer Key
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-gray-600">No questions found. Generate some questions first!</div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.length === 0 ? (
              <div className="text-gray-600">No questions match the selected filters.</div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <div key={q.id || idx} className="bg-white p-6 rounded-lg shadow-md border relative flex">
                  <div className="flex flex-col justify-start items-center mr-4 pt-2">
                    <input
                      type="checkbox"
                      checked={!!q.id && selectedIds.includes(q.id)}
                      onChange={() => q.id && toggleSelect(q.id)}
                      className="accent-blue-600"
                      aria-label="Select question"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 text-sm text-gray-700 flex flex-wrap gap-2">
                      <span>Type: <b className="text-gray-900">{q.question_type}</b></span>
                      <span>Subject: <b className="text-gray-900">{q.subject}</b></span>
                      <span>Grade: <b className="text-gray-900">{q.grade}</b></span>
                      <span>Difficulty: <b className="text-gray-900">{q.difficulty}</b></span>
                      <span>Bloom's: <b className="text-gray-900">{q.blooms_level}</b></span>
                      <span>Created: <b className="text-gray-900">{q.created_at ? new Date(q.created_at).toLocaleString() : "-"}</b></span>
                    </div>
                    <div className="font-semibold text-lg mb-4 text-gray-900 leading-loose">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <span className="block" style={{ lineHeight: '2' }}>{children}</span>
                        }}
                      >
                        {q.question}
                      </ReactMarkdown>
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div className="ml-6 mb-4 text-gray-800">
                        {q.options.map((opt, i) => {
                          // Remove any leading label (e.g., 'A) ', 'B) ', etc.) from option text
                          const cleanedOpt = typeof opt === 'string' ? opt.replace(/^[A-Z][\\)\\.\\:]\\s*/i, '') : opt;
                          return (
                            <div key={i} className="leading-loose flex items-baseline">
                              <span className="font-bold mr-2">{String.fromCharCode(65 + i)})</span>
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{p: ({children}) => <span className="block" style={{ lineHeight: '2' }}>{children}</span>}}
                              >
                                {cleanedOpt}
                              </ReactMarkdown>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mb-4 text-green-700 font-medium leading-loose">
                      <b>Answer:</b>{" "}
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{p: ({children}) => <span className="block" style={{ lineHeight: '2' }}>{children}</span>}}
                      >
                        {q.correct_answer}
                      </ReactMarkdown>
                    </div>
                    {q.explanation && (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 text-base mt-2 leading-loose">
                        <b>Explanation:</b>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{p: ({children}) => <span className="block" style={{ lineHeight: '2' }}>{children}</span>}}
                        >
                          {q.explanation}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {/* Delete button */}
                  {q.id && (
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setPendingDeleteId(q.id!);
                      }}
                      disabled={deletingId === q.id}
                      className="absolute top-4 right-4 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      {deletingId === q.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        <div className="pt-8">
          <Link href="/">
            <span className="text-blue-600 hover:underline">&larr; Back to Home</span>
          </Link>
        </div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Delete Question?</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to delete this question? This action cannot be undone for your account, but the question will remain in the database.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPendingDeleteId(null);
                }}
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deletingId === pendingDeleteId}
              >
                {deletingId === pendingDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}