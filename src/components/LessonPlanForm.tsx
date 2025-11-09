"use client";

import { useState, useRef } from "react";
import { BookOpenIcon, Cog6ToothIcon, DocumentTextIcon, CloudArrowUpIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { subjectMap } from "@/components/subjectMap";
import { LESSON_PLAN_SECTIONS, LessonPlanFormData } from "@/types/lessonPlan";
import { validatePDFFile, formatFileSize } from "@/lib/pdfExtractor";

interface Props {
  onSubmit: (formData: LessonPlanFormData) => void;
  isLoading?: boolean;
}

const gradeOptions = [
  "Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12",
  "Undergraduate","Graduate"
];

const subjectOptions = Object.keys(subjectMap);

export default function LessonPlanForm({ onSubmit, isLoading = false }: Props) {
  const [formData, setFormData] = useState<LessonPlanFormData>({
    subject: "",
    grade: "Grade 6",
    chapterName: "",
    sections: Object.values(LESSON_PLAN_SECTIONS), // All sections selected by default
    additionalNotes: ""
  });

  const [error, setError] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof LessonPlanFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(""); // Clear error when user makes changes
  };

  const handleSectionToggle = (sectionName: string) => {
    const newSections = formData.sections.includes(sectionName)
      ? formData.sections.filter(s => s !== sectionName)
      : [...formData.sections, sectionName];
    handleChange("sections", newSections);
  };

  const handlePDFUpload = (file: File) => {
    const validation = validatePDFFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid PDF file");
      return;
    }

    setPdfFile(file);
    setFormData(prev => ({ ...prev, pdfFile: file }));
    setError(""); // Clear any previous errors
    
    console.log("📄 PDF file uploaded:", file.name, "Size:", formatFileSize(file.size));
    console.log("🚀 PDF will be processed directly by Gemini AI - no text extraction needed!");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handlePDFUpload(pdfFile);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePDFUpload(file);
    }
  };

  const removePDF = () => {
    setPdfFile(null);
    setFormData(prev => ({ ...prev, pdfFile: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    if (!formData.subject) {
      setError("Please select a subject");
      return false;
    }
    if (!formData.grade) {
      setError("Please select a grade level");
      return false;
    }
    if (formData.sections.length === 0) {
      setError("Please select at least one lesson plan section");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const finalFormData: LessonPlanFormData = {
      ...formData,
      pdfFile: pdfFile || undefined
    };
    
    onSubmit(finalFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Subject Information Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <BookOpenIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1 dark:text-gray-200">Subject Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Subject *</label>
            <select
              value={formData.subject}
              onChange={e => handleChange("subject", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              required
            >
              <option value="">Select subject</option>
              {subjectOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Grade Level *</label>
            <select
              value={formData.grade}
              onChange={e => handleChange("grade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Chapter Name</label>
            <input
              type="text"
              value={formData.chapterName || ""}
              onChange={e => handleChange("chapterName", e.target.value)}
              placeholder="e.g., Fractions, Photosynthesis"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Lesson Plan Sections Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-3">
            <Cog6ToothIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1 dark:text-gray-200">Lesson Plan Sections</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
          Select which sections to include in your lesson plan:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(LESSON_PLAN_SECTIONS).map(sectionName => (
            <label key={sectionName} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sections.includes(sectionName)}
                onChange={() => handleSectionToggle(sectionName)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sectionName}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
          Selected sections: {formData.sections.length}
        </p>
      </div>

      {/* PDF Upload Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-3">
            <CloudArrowUpIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1 dark:text-gray-200">Chapter Content (Optional)</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
          Upload a PDF chapter to help AI generate more contextual lesson plans:
        </p>
        
        {!pdfFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
          >
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2 dark:text-gray-300">
              Drop your PDF here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 underline dark:text-blue-400"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Maximum file size: 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{pdfFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(pdfFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removePDF}
                className="text-red-600 hover:text-red-700 text-sm font-medium dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 dark:bg-gray-900/70 dark:border-gray-700/20">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-3">
            <DocumentTextIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1 dark:text-gray-200">Additional Notes to AI</h3>
        </div>
        <textarea
          value={formData.additionalNotes}
          onChange={e => handleChange("additionalNotes", e.target.value)}
          placeholder="Any special instructions, teaching methods, or specific focus areas for the AI to consider..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 h-32 resize-vertical dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow duration-300 dark:bg-gray-900/70 dark:border-gray-700/20">
        <button 
          type="submit" 
          className={`
            w-full font-medium py-4 px-6 rounded-xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isLoading
              ? 'bg-blue-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }
            text-white shadow-md
          `}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-3">
              <ArrowPathIcon className="animate-spin h-5 w-5 text-white" />
              <span>Analyzing Chapter...</span>
            </div>
          ) : (
            <span className="text-lg">Generate Lesson Plan ✨</span>
          )}
        </button>
      </div>
    </form>
  );
}