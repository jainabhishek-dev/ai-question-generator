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
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";


export default function MyQuestionsPage() {
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
            // Helper: Split long text to fit within page width
            const splitText = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
                return pdf.splitTextToSize(text, maxWidth);
            };
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
            let pageWidth = pdf.internal.pageSize.getWidth();
            let y = 40;
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            const heading = "Worksheet";
            const headingWidth = pdf.getTextWidth(heading);
            pdf.text(heading, (pageWidth - headingWidth) / 2, y);
            y += 12;
            pdf.setLineWidth(1);
            pdf.line(40, y, pageWidth - 40, y);
            y += 18;
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");

            // Helper: Render LaTeX to image using KaTeX
            const renderLatexToImage = async (latex: string) => {
                const katex = (await import("katex")).default;
                const html2canvas = (await import("html2canvas")).default;
                const tempDiv = document.createElement("div");
                tempDiv.style.position = "absolute";
                tempDiv.style.left = "-9999px";
                tempDiv.style.background = "white";
                tempDiv.style.fontSize = "18px";
                tempDiv.innerHTML = katex.renderToString(latex, { throwOnError: false });
                document.body.appendChild(tempDiv);
                await new Promise(resolve => setTimeout(resolve, 10));
                const canvas = await html2canvas(tempDiv, { backgroundColor: "white", scale: 2 });
                document.body.removeChild(tempDiv);
                return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
            };

            for (const [idx, q] of exportQuestions.entries()) {
                // Question text with markdown and equations
                let qText = `${idx + 1}. ${q.question}`;
                // Replace **bold** and *italic* with markers
                qText = qText.replace(/\*\*(.*?)\*\*/g, '[b]$1[/b]');
                qText = qText.replace(/\*(.*?)\*/g, '[i]$1[/i]');
                // Split into lines (handle \n and block equations)
                const lines = qText.split(/\n|(?=(\$\$[^$]+\$\$))/g).filter(l => l && l.trim() !== '');
                for (let line of lines) {
                    let x = 40;
                    // Split by inline/block equations
                    const parts = line.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
                    let isBlockLine = false;
                    for (let part of parts) {
                        if (/^\$\$[^$]+\$\$$/.test(part)) {
                            // Block equation always starts new line
                            const latex = part.replace(/\$\$/g, '');
                            const eqImg = await renderLatexToImage(latex);
                            pdf.addImage(eqImg.dataUrl, 'PNG', x, y, 220, eqImg.height * (220 / eqImg.width));
                            y += eqImg.height * (220 / eqImg.width) + 6;
                            isBlockLine = true;
                            x = 40;
                        } else if (/^\$[^$]+\$/.test(part)) {
                            // Inline equation
                            const latex = part.replace(/\$/g, '');
                            const eqImg = await renderLatexToImage(latex);
                            pdf.addImage(eqImg.dataUrl, 'PNG', x, y, 80, eqImg.height * (80 / eqImg.width));
                            x += 80 + 4;
                        } else {
                            // Normal text, handle mixed bold/italic and wrap
                            // Split into segments: [b]...[/b], [i]...[/i], and normal
                            const segments = [];
                            let segText = part;
                            let regex = /\[b\](.*?)\[\/b\]|\[i\](.*?)\[\/i\]/g;
                            let lastIndex = 0;
                            let match;
                            while ((match = regex.exec(segText)) !== null) {
                                if (match.index > lastIndex) {
                                    segments.push({ text: segText.substring(lastIndex, match.index), style: 'normal' });
                                }
                                if (match[1]) {
                                    segments.push({ text: match[1], style: 'bold' });
                                } else if (match[2]) {
                                    segments.push({ text: match[2], style: 'italic' });
                                }
                                lastIndex = regex.lastIndex;
                            }
                            if (lastIndex < segText.length) {
                                segments.push({ text: segText.substring(lastIndex), style: 'normal' });
                            }
                            // Render each segment
                            let prevEndedWithSpace = false;
                            for (const seg of segments) {
                                // If previous segment ended with space, add space before this segment
                                if (prevEndedWithSpace) {
                                    x += pdf.getTextWidth(' ');
                                }
                                pdf.setFont('helvetica', seg.style);
                                const wrapped = splitText(pdf, seg.text, pageWidth - x - 40);
                                for (let w = 0; w < wrapped.length; w++) {
                                    pdf.text(wrapped[w], x, y);
                                    if (w < wrapped.length - 1) {
                                        y += 18;
                                        x = 40;
                                    } else {
                                        x += pdf.getTextWidth(wrapped[w]);
                                    }
                                }
                                prevEndedWithSpace = seg.text.endsWith(' ');
                            }
                        }
                    }
                    if (!isBlockLine) y += 18;
                }
                // Options
                if (q.options && q.options.length > 0) {
                    for (let i = 0; i < q.options.length; i++) {
                        let opt = q.options[i];
                        let optText = `${String.fromCharCode(65 + i)}) ${typeof opt === 'string' ? opt.replace(/^[A-Z][\)\.\:]\s*/i, '') : opt}`;
                        optText = optText.replace(/\*\*(.*?)\*\*/g, '[b]$1[/b]');
                        optText = optText.replace(/\*(.*?)\*/g, '[i]$1[/i]');
                        // Split into lines
                        const optLines = optText.split(/\n|(?=(\$\$[^$]+\$\$))/g).filter(l => l && l.trim() !== '');
                        for (let line of optLines) {
                            let optX = 60;
                            const optParts = line.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
                            let isBlockLine = false;
                            for (let part of optParts) {
                                if (/^\$\$[^$]+\$\$$/.test(part)) {
                                    const latex = part.replace(/\$\$/g, '');
                                    const eqImg = await renderLatexToImage(latex);
                                    pdf.addImage(eqImg.dataUrl, 'PNG', optX, y, 180, eqImg.height * (180 / eqImg.width));
                                    y += eqImg.height * (180 / eqImg.width) + 2;
                                    isBlockLine = true;
                                    optX = 60;
                                } else if (/^\$[^$]+\$/.test(part)) {
                                    const latex = part.replace(/\$/g, '');
                                    const eqImg = await renderLatexToImage(latex);
                                    pdf.addImage(eqImg.dataUrl, 'PNG', optX, y, 60, eqImg.height * (60 / eqImg.width));
                                    optX += 60 + 4;
                                } else {
                                    // Normal text, handle mixed bold/italic and wrap
                                    const segments = [];
                                    let segText = part;
                                    let regex = /\[b\](.*?)\[\/b\]|\[i\](.*?)\[\/i\]/g;
                                    let lastIndex = 0;
                                    let match;
                                    while ((match = regex.exec(segText)) !== null) {
                                        if (match.index > lastIndex) {
                                            segments.push({ text: segText.substring(lastIndex, match.index), style: 'normal' });
                                        }
                                        if (match[1]) {
                                            segments.push({ text: match[1], style: 'bold' });
                                        } else if (match[2]) {
                                            segments.push({ text: match[2], style: 'italic' });
                                        }
                                        lastIndex = regex.lastIndex;
                                    }
                                    if (lastIndex < segText.length) {
                                        segments.push({ text: segText.substring(lastIndex), style: 'normal' });
                                    }
                                    let prevEndedWithSpace = false;
                                    for (const seg of segments) {
                                        if (prevEndedWithSpace) {
                                            optX += pdf.getTextWidth(' ');
                                        }
                                        pdf.setFont('helvetica', seg.style);
                                        const wrapped = splitText(pdf, seg.text, pageWidth - optX - 40);
                                        for (let w = 0; w < wrapped.length; w++) {
                                            pdf.text(wrapped[w], optX, y);
                                            if (w < wrapped.length - 1) {
                                                y += 16;
                                                optX = 60;
                                            } else {
                                                optX += pdf.getTextWidth(wrapped[w]);
                                            }
                                        }
                                        prevEndedWithSpace = seg.text.endsWith(' ');
                                    }
                                }
                            }
                            if (!isBlockLine) y += 16;
                        }
                    }
                }
                y += 8;
                pdf.setDrawColor(180);
                pdf.setLineWidth(0.5);
                pdf.line(40, y, pageWidth - 40, y);
                y += 18;
                if (y > 780) { pdf.addPage(); y = 40; }
            }
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

            const renderMarkdownToImage = async (markdown: string, pdfWidthPt: number) => {
                const html2canvas = (await import("html2canvas")).default;
                const devicePixelRatio = window.devicePixelRatio || 2;
                const pxWidth = Math.round(pdfWidthPt * devicePixelRatio);
                const tempDiv = document.createElement("div");
                tempDiv.style.position = "absolute";
                tempDiv.style.left = "-9999px";
                tempDiv.style.width = pxWidth + "px";
                tempDiv.style.background = "white";
                tempDiv.style.fontSize = "22px";
                tempDiv.style.lineHeight = "1.4";
                tempDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
                document.body.appendChild(tempDiv);
                const ReactDOM = await import("react-dom/client");
                const root = ReactDOM.createRoot(tempDiv);
                root.render(
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{markdown}</ReactMarkdown>
                );
                await new Promise(resolve => setTimeout(resolve, 50));
                const canvas = await html2canvas(tempDiv, { backgroundColor: "white", scale: devicePixelRatio });
                document.body.removeChild(tempDiv);
                return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, pxWidth };
            };

            for (const [idx, q] of exportQuestions.entries()) {
                let qText = `${idx + 1}. ${q.question}`;
                const imgObj = await renderMarkdownToImage(qText, 480);
                const imgWidth = 480;
                const imgHeight = Math.round(imgObj.height * (imgWidth / imgObj.pxWidth));
                pdf.addImage(imgObj.dataUrl, "PNG", 40, y, imgWidth, imgHeight);
                y += imgHeight + 4;
                if (q.options && q.options.length > 0) {
                    for (let i = 0; i < q.options.length; i++) {
                        let opt = q.options[i];
                        let optText = `${String.fromCharCode(65 + i)}) ${typeof opt === 'string' ? opt.replace(/^[A-Z][\)\.\:]\s*/i, '') : opt}`;
                        const optObj = await renderMarkdownToImage(optText, 440);
                        const optWidth = 440;
                        const optHeight = Math.round(optObj.height * (optWidth / optObj.pxWidth));
                        pdf.addImage(optObj.dataUrl, "PNG", 60, y, optWidth, optHeight);
                        y += optHeight + 2;
                    }
                }
                y += 4;
                const ansObj = await renderMarkdownToImage(`**Answer:** ${q.correct_answer}`, 440);
                const ansWidth = 440;
                const ansHeight = Math.round(ansObj.height * (ansWidth / ansObj.pxWidth));
                pdf.addImage(ansObj.dataUrl, "PNG", 60, y, ansWidth, ansHeight);
                y += ansHeight + 2;
                if (q.explanation) {
                    const expObj = await renderMarkdownToImage(`_Explanation:_ ${q.explanation}`, 440);
                    const expWidth = 440;
                    const expHeight = Math.round(expObj.height * (expWidth / expObj.pxWidth));
                    pdf.addImage(expObj.dataUrl, "PNG", 60, y, expWidth, expHeight);
                    y += expHeight + 2;
                }
                y += 10;
                if (y > 780) { pdf.addPage(); y = 40; }
            }
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
                          const cleanedOpt = typeof opt === 'string' ? opt.replace(/^[A-Z][\)\.\:]\s*/i, '') : opt;
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
