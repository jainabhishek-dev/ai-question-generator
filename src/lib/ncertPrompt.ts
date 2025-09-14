import { Inputs } from "@/components/AdvancedQuestionForm"

const bloomsDescriptions: Record<string, string> = {
  Remember: "Generate questions that require students to recall, recognize, or identify specific facts, terms, concepts, or procedures. Use verbs: define, list, name, identify, describe, match.",
  Understand: "Create questions requiring students to explain, interpret, summarize, or give examples. Use verbs: explain, compare, contrast, illustrate, classify, summarize.",
  Apply: "Design questions where students use learned information in new situations or solve problems. Use verbs: apply, demonstrate, calculate, solve, show, use.",
  Analyze: "Develop questions requiring students to break down information, examine relationships, or identify patterns. Use verbs: analyze, differentiate, organize, compare, categorize.",
  Evaluate: "Create questions asking students to make judgments, critique, or justify decisions based on criteria. Use verbs: evaluate, critique, judge, defend, support.",
  Create: "Generate questions requiring students to combine ideas, design solutions, or produce original work. Use verbs: create, design, construct, develop, formulate."
}

const questionTypeInstructions: Record<string, string[]> = {
  mcq: [
    "multiple-choice questions:",
    "- Provide exactly 4 options labeled A, B, C, D",
    "- correctAnswer field must contain ONLY the letter (e.g., 'A')",
    "- Make all distractors plausible but clearly incorrect",
    "- Avoid 'All of the above' or 'None of the above' unless educationally valuable"
  ],
  trueFalse: [
    "true-false questions:",
    "- correctAnswer must be exactly 'True' or 'False'",
    "- Avoid statements that are partially true or depend on interpretation"
  ],
  fillBlank: [
    "fill-in-the-blank questions:",
    "- Use clear blanks: 'The capital of France is _______.'",
    "- correctAnswer should be the exact word(s) expected",
    "- For multiple acceptable answers, provide the most common/standard answer"
  ],
  shortAnswer: [
    "short-answer questions:",
    "- Expect 1-3 sentence responses",
    "- correctAnswer should be a model answer (2-3 sentences max)"
  ],
  longAnswer: [
    "long-answer questions:",
    "- Expect paragraph-length responses",
    "- correctAnswer should outline key points expected (bullet format acceptable)"
  ]
}

export function createNCERTPrompt(inputs: Inputs) {
  const {
    subject, grade, chapterNumber, chapterName, learningOutcome,
    difficulty, bloomsLevel, totalQuestions, numMCQ, numTrueFalse,
    numFillBlank, numShortAnswer, numLongAnswer, additionalNotes
  } = inputs

  const contextInfo = [
    `Subject: ${subject}`,
    `Grade: ${grade}`,
    `Chapter Number: ${chapterNumber}`,
    `Chapter Name: ${chapterName}`,
    `Learning Outcomes: ${learningOutcome}`,
    `Difficulty: ${difficulty}`,
    `Bloom's Taxonomy Level: ${bloomsLevel}`,
    additionalNotes && `Teacher Notes: ${additionalNotes}`
  ].filter(Boolean).join("\n")

  const distributionInfo = `Generate exactly:
    - ${numMCQ} multiple-choice questions
    - ${numFillBlank} fill-in-the-blank questions
    - ${numShortAnswer} short-answer questions
    - ${numLongAnswer} long-answer questions
    - ${numTrueFalse} true-false questions
    Total questions must equal ${totalQuestions}.`

  const bloomsContext = bloomsDescriptions[bloomsLevel] ?? ""
  
  const qTypeSections: string[] = []
  if (numMCQ > 0) qTypeSections.push(...questionTypeInstructions.mcq)
  if (numTrueFalse > 0) qTypeSections.push(...questionTypeInstructions.trueFalse)
  if (numFillBlank > 0) qTypeSections.push(...questionTypeInstructions.fillBlank)
  if (numShortAnswer > 0) qTypeSections.push(...questionTypeInstructions.shortAnswer)
  if (numLongAnswer > 0) qTypeSections.push(...questionTypeInstructions.longAnswer)

  const formattingRequirements = [
  // Output Structure & Format
  "Return ONLY valid JSON. No additional text before or after the JSON array.",
  "Return the result as a JSON array of question objects, even if there is only one question.",
  "Each question object must contain exactly these keys: type, question, options, correctAnswer, explanation.",
  "For multiple-choice questions:",
  "- options must be an array like: ['A) Option text', 'B) Option text', 'C) Option text', 'D) Option text']",
  "- correctAnswer field must be the option label only ('A', 'B', 'C', or 'D'), not the answer text",

  // Content Quality Standards
  "Question Quality Requirements:",
  "- Each question must be clear, unambiguous, and age-appropriate for the specified grade level",
  "- Avoid trick questions, double negatives, or confusing wording", 
  "- Ensure questions test understanding, not memorization (unless specifically requested)",
  "- Include diverse question stems: 'Which of the following...', 'What is the primary...', 'How does...', etc.",

  // Mathematical & Currency Formatting
  "Mathematical Expressions:",
  "- Use standard LaTeX syntax wrapped in single dollar signs: $x^2 + y^2 = z^2$",
  "- Use escaped dollar for dollar sign (\\$), not a plain dollar sign ($)",
  "- Use Unicode symbols when appropriate: ₹, €, £, %, °C, π, ∞",
  "- Format large numbers with commas: 1,000,000 not 1000000",

  ...qTypeSections,

  // Explanation Requirements  
  "Explanation Standards:",
  "- Keep explanations concise but complete (2-4 sentences ideal)",
  "- Explain WHY the correct answer is right, not just WHAT it is",
  "- For incorrect options in MCQ, briefly explain why they're wrong when helpful",
  "- Use grade-appropriate vocabulary in explanations",

  // Content Accuracy & Consistency
  "Accuracy Requirements:",
  "- All factual information must be current and accurate",
  "- Cross-reference dates, names, formulas, and statistics",
  "- Ensure consistency in terminology throughout all questions",
  "- Round numerical answers appropriately for the grade level",

  // Validation Rules
  "Quality Checks:",
  "- Each question must align with the specified Bloom's taxonomy level",
  "- Verify that difficulty matches the grade level appropriately", 
  "- Ensure no duplicate questions or overly similar questions",
  "- Check that the total question count matches the requested distribution exactly"
].join("\n")

  const validationInstructions = `
    VALIDATION CHECKLIST - Verify before responding:
    □ Total questions equal exactly ${totalQuestions}
    □ Distribution matches: ${numMCQ} MCQ, ${numTrueFalse} T/F, ${numFillBlank} Fill, ${numShortAnswer} Short, ${numLongAnswer} Long
    □ All MCQ have exactly 4 options (A, B, C, D) and correctAnswer is a single letter
    □ All T/F have exactly 2 options ['True', 'False'] and correctAnswer matches
    □ All questions include required fields
    □ JSON syntax is valid (no trailing commas, proper escaping)
    □ No placeholder text like "[Insert explanation]" remains
    `

  return [
    "You are an expert educational assessment designer with deep knowledge of NCERT curriculum and pedagogy.",
    `CONTEXT:\n${contextInfo}`,
    `BLOOM'S TAXONOMY TARGET:\n${bloomsContext}`,
    `QUESTION DISTRIBUTION REQUIREMENTS:\n${distributionInfo}`,
    formattingRequirements,
    validationInstructions,
    "FINAL INSTRUCTION: Generate questions that are educationally meaningful, technically accurate, and perfectly formatted according to the specifications above. Double-check all requirements before responding."
  ].filter(Boolean).join("\n\n")
}