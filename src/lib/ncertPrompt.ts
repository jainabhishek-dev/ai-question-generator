import { Inputs } from "@/components/AdvancedQuestionForm"

const gradeContexts: Record<string,string> = {
  "Kindergarten": "Use very simple language, single-step instructions, and focus on basic recognition and identification skills.",
  "Grade 1": "Use simple vocabulary, short sentences, and focus on fundamental concepts with concrete examples.",
  "Grade 2": "Use 1-2 sentence explanations, introduce basic comparisons, and build on prior knowledge gradually.",
  "Grade 3": "Use age-appropriate language, introduce multi-concept questions, and encourage simple reasoning.",
  "Grade 4": "Introduce multi-step reasoning, connect concepts across topics, and use moderate complexity.",
  "Grade 5": "Use moderate vocabulary, expect detailed explanations, and introduce abstract thinking.",
  "Grade 6": "Ensure concepts are concrete and relatable, bridge elementary to middle school concepts.",
  "Grade 7": "Bridge concrete to abstract ideas, introduce more complex relationships between concepts.",
  "Grade 8": "Encourage analytical thinking, expect deeper understanding, and introduce advanced applications.",
  "Grade 9": "Introduce foundational high-school rigor, expect sophisticated reasoning and connections.",
  "Grade 10": "Use real-world scenarios and critical thinking, prepare for board exam complexity.",
  "Grade 11": "Prepare for standardized exams, expect deeper analysis and synthesis of concepts.",
  "Grade 12": "College-prep complexity, include evaluation tasks and advanced critical thinking."
}

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
    "- options must be an array like: ['A) Option text', 'B) Option text', 'C) Option text', 'D) Option text']",
    "- correctAnswer field must be the option label only ('A', 'B', 'C', or 'D'), not the answer text",
    "- Make all distractors plausible but clearly incorrect",
    "- Avoid 'All of the above' or 'None of the above' unless educationally valuable",
    "- Use command words like 'Which of the following...', 'What is the primary...', 'When does...'",
    "- Options must be numerical values OR single words OR dates/years only. Each option should be limited to one or two words only."
  ],
  trueFalse: [
    "true-false questions:",
    "- correctAnswer must be exactly 'True' or 'False'",
    "- Use clear, factual statements that are definitively true or false",
    "- All T/F have exactly 2 options [\'True\', \'False\'] and correctAnswer matches'"
  ],
  fillBlank: [
    "fill-in-the-blank questions:",
    "- Use clear blank: 'The capital of France is _______.'",
    "- Use only 1 blank per question",
    "- correctAnswer should be the exact word expected"
  ],
  shortAnswer: [
    "short-answer questions:",
    "- Expect 1-3 sentence responses",
    "- correctAnswer should be a model answer (2-3 sentences max)",
    "- Use direct, specific question stems: 'Explain how...', 'Describe why...', 'What are the main...'"
  ],
  longAnswer: [
    "long-answer questions:",
    "- Expect paragraph-length responses",
    "- correctAnswer should outline key points expected (bullet format acceptable)",
    "- Use direct, specific question stems: 'Explain how...', 'Describe why...', 'What are the main...'"    
  ]
}

// Import image generation helpers from gemini.ts
import { getImageInstructions } from './gemini'

export function createNCERTPrompt(inputs: Inputs) {
  const {
    subject, grade, chapterNumber, chapterName, learningOutcome,
    difficulty, bloomsLevel, totalQuestions, numMCQ, numTrueFalse,
    numFillBlank, numShortAnswer, numLongAnswer, additionalNotes, enableImages
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

  const distributionParts: string[] = []
  if (numMCQ > 0) distributionParts.push(`- ${numMCQ} multiple-choice questions`)
  if (numFillBlank > 0) distributionParts.push(`- ${numFillBlank} fill-in-the-blank questions`)
  if (numShortAnswer > 0) distributionParts.push(`- ${numShortAnswer} short-answer questions`)
  if (numLongAnswer > 0) distributionParts.push(`- ${numLongAnswer} long-answer questions`)
  if (numTrueFalse > 0) distributionParts.push(`- ${numTrueFalse} true-false questions`)
  
  const distributionInfo = `Generate exactly:
${distributionParts.join('\n')}
  Total questions must equal ${totalQuestions}.`

  // Only include the specific grade context for the selected grade
  const gradeContext = gradeContexts[grade] 
    ? `Grade-Specific Guidelines for ${grade}:\n${gradeContexts[grade]}`
    : ""

  // Only include the specific Bloom's description for the selected level
  const bloomsContext = bloomsDescriptions[bloomsLevel]
    ? `Bloom's Taxonomy Level - ${bloomsLevel}:\n${bloomsDescriptions[bloomsLevel]}`
    : ""
  
  const qTypeSections: string[] = []
  if (numMCQ > 0) qTypeSections.push(...questionTypeInstructions.mcq)
  if (numTrueFalse > 0) qTypeSections.push(...questionTypeInstructions.trueFalse)
  if (numFillBlank > 0) qTypeSections.push(...questionTypeInstructions.fillBlank)
  if (numShortAnswer > 0) qTypeSections.push(...questionTypeInstructions.shortAnswer)
  if (numLongAnswer > 0) qTypeSections.push(...questionTypeInstructions.longAnswer)

  // Only add question type section if there are specific instructions
  const questionTypeSection = qTypeSections.length > 0 
    ? ["Question Type Requirements:", ...qTypeSections].join("\n")
    : ""

  const formattingRequirements = [
  "Output Structure & Format:",
  "Return ONLY valid JSON. No additional text before or after the JSON array.",
  "Return the result as a JSON array of question objects, even if there is only one question.",
  "Each question object must contain exactly these keys: type, question, options, correctAnswer, explanation.",

  // Mathematical & Currency Formatting - CRITICAL RULES
  "Mathematical Expressions & Currency Formatting:",
  "- For mathematical expressions: Use single dollar signs ONLY for math: $x^2 + y^2 = z^2$, $18 + x = 45$, $\\frac{a}{b} = c$",
  "- For LaTeX fractions: Use proper escaping: $\\frac{3}{4}$, not $\frac{3}{4}$ or $3/4$ in text",
  "- For decimal numbers in math context: Use plain decimals WITHOUT any symbols: 0.75, 2.4, 3.14159",
  "- For variable references in text: Use math delimiters: the variable $x$ represents...",
  "",
  "Currency Formatting (CRITICAL):",
  "- For ALL currency amounts: Use ₹ (rupee symbol) - NEVER use $ for currency",
  "- Keep currency symbols OUTSIDE of math delimiters: The item costs ₹50 (not $₹50$ or $\\text{₹}50$)",
  "- Never use \\text{} command for currency inside math expressions",
  "- Other currency symbols when appropriate: €, £, ¥",
  "",
  "- Use Unicode symbols when appropriate: %, °C, π, ∞",
  "- Format large numbers with commas: 1,000,000 not 1000000",
  
  // Explanation Requirements  
  "Explanation Standards:",
  "- Keep explanations concise but complete (2-4 sentences ideal)",
  "- When subject is Mathematics, show step-by step solution like a student is expected to solve in exam.",
  ...(numMCQ > 0 ? ["- For MCQ: briefly explain why incorrect options are wrong when helpful"] : []),
  "- Use grade-appropriate vocabulary in explanations",

  // Content Accuracy & Consistency
  "Accuracy Requirements:",
  "- All factual information must be current and accurate",
  "- Cross-reference dates, names, formulas, and statistics",
  "- Ensure consistency in terminology throughout all questions",
  "- Questions should be concrete and factual rather than hypothetical scenarios",

  // Validation Rules
  "Final Validation Rules:",
  "- All questions must be unique and plagiarism-free.",
  "- Each question must align with the specified Bloom's taxonomy level",
  "- Verify that difficulty matches the grade level appropriately", 
  "- Ensure no duplicate questions or similar questions. All questions should be different and unique",
  "- Check that the total question count matches the requested distribution exactly"
].join("\n")

  // Markdown Formatting Reference (separate section)
  const markdownReference = [
  "FORMATTING REFERENCE - Markdown Guide:",
  "Tables:",
  "  | Header 1 | Header 2 | Header 3 |",
  "  |----------|----------|----------|",
  "  | Data 1   | Data 2   | Data 3   |",
  "  - Can include math ($x^2$) in cells",
  "  - Leave blank line after tables for proper rendering",
  "Lists:",
  "  - Bullet points: Use '-' or '*' for unordered lists",
  "  - Numbered lists: Use '1.', '2.', '3.' for ordered lists",
  "  - Nested lists: Indent with 2-4 spaces",
  "Multi-paragraph:",
  "  - Use double newlines (\\n\\n) for paragraph breaks",
  "  - Single newlines (\\n) for line breaks within paragraphs",
  "Code blocks:",
  "  - Use triple backticks (```) for code blocks",
  "  - Specify language: ```python or ```javascript",
  "Horizontal rules:",
  "  - Use '---' or '***' on separate line for dividers"
].join("\n")

  // Add image instructions for NCERT content
  const imageInstructions = getImageInstructions(enableImages || false)

  return [
    "You are an expert assessment designer with deep knowledge of NCERT curriculum and pedagogy.",
    `CONTEXT:\n${contextInfo}`,
    gradeContext,
    bloomsContext,
    imageInstructions, // Add NCERT-specific image instructions
    `QUESTION DISTRIBUTION REQUIREMENTS:\n${distributionInfo}`,
    formattingRequirements,
    markdownReference,
    questionTypeSection // Only included if there are specific question type instructions
  ].filter(Boolean).join("\n\n")
}