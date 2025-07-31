"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserQuestions, QuestionRecord, softDeleteUserQuestion } from "@/lib/database";

// All possible filter options (from AdvancedQuestionForm)
const ALL_TYPE_OPTIONS = [
  "multiple-choice",
  "fill-in-the-blank",
  "short-answer",
  "long-answer"
];
const ALL_GRADE_OPTIONS = [
  "Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12",
  "Undergraduate","Graduate"
];
const ALL_DIFFICULTY_OPTIONS = ["Easy","Medium","Hard"];
const ALL_BLOOMS_OPTIONS = [
  "Remember","Understand","Apply","Analyze","Evaluate","Create"
];

import Link from "next/link";
// For PDF export
import jsPDF from "jspdf";


export default function MyQuestionsPage() {
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [bloomsFilter, setBloomsFilter] = useState<string>("");
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
  const typeOptions = ALL_TYPE_OPTIONS;
  const gradeOptions = ALL_GRADE_OPTIONS;
  const difficultyOptions = ALL_DIFFICULTY_OPTIONS;
  const bloomsOptions = ALL_BLOOMS_OPTIONS;

  // Delete handler (soft delete)
  const handleDelete = async (id: number) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const res = await softDeleteUserQuestion(id, user.id);
      if (res.success) {
        setQuestions(prev => prev.filter(q => q.id !== id));
      } else {
        setError(res.error || "Failed to delete question.");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setPendingDeleteId(null);
    }
  };

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-700">Loading your questions...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="mb-4">You must be signed in to view your saved questions.</p>
          <Link href="/">
            <span className="text-blue-600 hover:underline">Go to Home</span>
          </Link>
        </div>
      </main>
    );
  }


    // Export as Worksheet (questions only)
    async function handleExportWorksheet(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
        event.preventDefault();
        const exportQuestions = selectedIds.length > 0
            ? filteredQuestions.filter(q => q.id && selectedIds.includes(q.id))
            : filteredQuestions;
        if (exportQuestions.length === 0) {
            setError("No questions to export.");
            return;
        }
        try {
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            let y = 40;
            pdf.setFontSize(18);
            pdf.text("Worksheet", 40, y);
            y += 30;
            pdf.setFontSize(12);
            exportQuestions.forEach((q, idx) => {
                let qText = `${idx + 1}. ${q.question}`;
                pdf.text(qText, 40, y, { maxWidth: 520 });
                y += 20;
                if (q.options && q.options.length > 0) {
                    q.options.forEach((opt, i) => {
                        pdf.text(`   ${String.fromCharCode(65 + i)}. ${opt}`, 60, y, { maxWidth: 480 });
                        y += 18;
                    });
                }
                y += 10;
                if (y > 780) { pdf.addPage(); y = 40; }
            });
            pdf.save("worksheet.pdf");
        } catch (err: any) {
            setError("Failed to export Worksheet: " + (err.message || "Unknown error"));
        }
    }

    // Export as Answer Key (questions + answers)
    async function handleExportAnswerKey(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
        event.preventDefault();
        const exportQuestions = selectedIds.length > 0
            ? filteredQuestions.filter(q => q.id && selectedIds.includes(q.id))
            : filteredQuestions;
        if (exportQuestions.length === 0) {
            setError("No questions to export.");
            return;
        }
        try {
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            let y = 40;
            pdf.setFontSize(18);
            pdf.text("Answer Key", 40, y);
            y += 30;
            pdf.setFontSize(12);
            exportQuestions.forEach((q, idx) => {
                let qText = `${idx + 1}. ${q.question}`;
                pdf.text(qText, 40, y, { maxWidth: 520 });
                y += 20;
                if (q.options && q.options.length > 0) {
                    q.options.forEach((opt, i) => {
                        pdf.text(`   ${String.fromCharCode(65 + i)}. ${opt}`, 60, y, { maxWidth: 480 });
                        y += 18;
                    });
                }
                y += 4;
                pdf.setFont("helvetica", "bold");
                pdf.text(`Answer:`, 60, y);
                pdf.setFont("helvetica", "normal");
                pdf.text(` ${q.correct_answer}`, 110, y);
                y += 18;
                if (q.explanation) {
                    pdf.setFont("helvetica", "italic");
                    pdf.text(`Explanation: ${q.explanation}`, 60, y, { maxWidth: 480 });
                    pdf.setFont("helvetica", "normal");
                    y += 18;
                }
                y += 10;
                if (y > 780) { pdf.addPage(); y = 40; }
            });
            pdf.save("answer-key.pdf");
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

        {/* Filters and Export */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border mb-2">
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
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {typeOptions.map(type => (
                <option key={type} value={type}>{type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Grade:</label>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {gradeOptions.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Difficulty:</label>
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {difficultyOptions.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm mr-1 text-gray-800 font-medium">Bloom's:</label>
            <select value={bloomsFilter} onChange={e => setBloomsFilter(e.target.value)} className="border rounded px-2 py-1 bg-gray-100 text-gray-900 font-medium focus:bg-white">
              <option value="">All</option>
              {bloomsOptions.map(bloom => (
                <option key={bloom} value={bloom}>{bloom}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportWorksheet}
            className="ml-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
                    <div className="font-semibold text-lg mb-2 text-gray-900">{q.question}</div>
                    {q.options && q.options.length > 0 && (
                      <ul className="list-disc ml-6 mb-2 text-gray-800">
                        {q.options.map((opt, i) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mb-1 text-gray-900"><b>Answer:</b> {q.correct_answer}</div>
                    {q.explanation && (
                      <div className="text-gray-800 text-sm"><b>Explanation:</b> {q.explanation}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
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
