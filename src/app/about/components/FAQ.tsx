'use client';
import { useState } from "react";

const faqs = [
  {
    question: "How many questions can I generate at once?",
    answer:
      "You can generate up to 10 questions in a single request. The distribution of question types must match your selected total. If you reach your free limit of 40 saved questions, you’ll need to delete some or subscribe for more.",
  },
  {
    question: "What types of questions can I generate?",
    answer:
      "Instaku currently supports multiple-choice, fill-in-the-blank, true-false, short answer, and long answer questions. You can customize the mix and difficulty for each batch.",
  },
  {
    question: "Can I export generated questions as a PDF?",
    answer:
      "Yes! You can export your selected questions as a PDF worksheet or an answer key. Use the Export options in your 'My Questions' library to download either format.",
  },
  {
    question: "Can I save the questions I have generated?",
    answer:
      "If you are signed in, generated questions are saved to your personal library. You can manage, filter, and export them anytime. Anonymous users can generate questions but need to sign in to save them.",
  },
  {
    question: "Is there a limit to how many questions I can save?",
    answer:
      "Free users can save up to 40 questions in their library. To save more, consider subscribing for expanded access.",
  },
  {
    question: "Can I filter or organize my saved questions?",
    answer:
      "Yes, you can filter your questions by type, grade level, difficulty, and Bloom’s taxonomy level in the 'My Questions' section.",
  },
  {
    question: "Can I customize the difficulty and grade level of generated questions?",
    answer:
      "Yes, you can select the grade level and difficulty for each batch of questions before generating them.",
  },
  {
    question: "Do I need an account to use Instaku?",
    answer:
      "You can generate questions without an account, but you need to sign in to save, organize, or export your questions.",
  },
  {
    question: "Can I edit or delete questions after saving them?",
    answer:
      "Yes, you can edit or delete any question in your personal library at any time.",
  },
  {
    question: "How do I contact support if I have an issue?",
    answer:
      "You can reach out to our support team via the Contact Us page for help with any issues or feedback.",
  },
  {
    question: "Who can use Instaku?",
    answer:
      "Anyone! Whether you're a teacher, student, tutor, or parent, our platform is designed to make question creation easy and accessible.",
  },

]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="space-y-2" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Frequently Asked Questions
      </h2>
      <div className="space-y-1">
        {faqs.map((faq, idx) => (
          <div key={faq.question} className="border rounded-lg bg-white/60 dark:bg-gray-800/60">
            <button
              className="w-full text-left px-3 py-2 font-medium text-blue-900 dark:text-blue-200 focus:outline-none flex justify-between items-center text-xs sm:text-sm"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              aria-expanded={openIndex === idx}
              aria-controls={`faq-${idx}`}
            >
              {faq.question}
              <span className="ml-2">{openIndex === idx ? "−" : "+"}</span>
            </button>
            {openIndex === idx && (
              <div id={`faq-${idx}`} className="px-3 pb-3 text-gray-700 dark:text-gray-200 animate-fade-in text-xs sm:text-sm">
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
    </section>
  );
}