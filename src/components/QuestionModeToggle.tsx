import React from "react"

interface Props {
  mode: "general" | "ncert"
  onChange: (mode: "general" | "ncert") => void
}

export default function QuestionModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex space-x-4 mb-6">
      <button
        className={`px-4 py-2 rounded ${mode === "general" ? "bg-blue-600 text-white" : "bg-gray-400"}`}
        onClick={() => onChange("general")}
      >
        General
      </button>
      <button
        className={`px-4 py-2 rounded ${mode === "ncert" ? "bg-blue-600 text-white" : "bg-gray-400"}`}
        onClick={() => onChange("ncert")}
      >
        NCERT
      </button>
    </div>
  )
}