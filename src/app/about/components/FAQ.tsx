'use client';
import { useState } from "react";

const faqs = [
  {
    question: "What is Instaku?",
    answer:
      "Instaku is an innovative tool that helps educators, students, and lifelong learners create high-quality, curriculum-aligned questions instantly using artificial intelligence.",
  },
  {
    question: "How does Instaku ensure question quality?",
    answer:
      "Our AI is trained on educational best practices and reviewed regularly to ensure accuracy, clarity, and alignment with learning objectives.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. We respect your privacy. Your questions and data are never shared or sold. All information is securely stored and handled with care.",
  },
  {
    question: "Who can use Instaku?",
    answer:
      "Anyone! Whether you're a teacher, student, tutor, or parent, our platform is designed to make question creation easy and accessible.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <h2 className="text-lg sm:text-xl font-semibold text-blue-800 dark:text-blue-200">Frequently Asked Questions</h2>
      <div className="space-y-1">
        {faqs.map((faq, idx) => (
          <div key={faq.question} className="border rounded-lg bg-white/60 dark:bg-gray-800/60">
            <button
              className="w-full text-left px-3 py-2 font-medium text-blue-900 dark:text-blue-200 focus:outline-none flex justify-between items-center text-sm sm:text-base"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              aria-expanded={openIndex === idx}
              aria-controls={`faq-${idx}`}
            >
              {faq.question}
              <span className="ml-2">{openIndex === idx ? "−" : "+"}</span>
            </button>
            {openIndex === idx && (
              <div id={`faq-${idx}`} className="px-3 pb-3 text-gray-700 dark:text-gray-200 animate-fade-in text-sm sm:text-base">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </div>
  );
}