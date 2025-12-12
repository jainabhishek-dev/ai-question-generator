import { GoogleGenerativeAI } from "@google/generative-ai"
import { Inputs } from "@/components/AdvancedQuestionForm"
import { createNCERTPrompt } from "@/lib/ncertPrompt"
import { createObjectiveExtractionPrompt, createLessonPlanPrompt } from "@/lib/lessonPlanPrompt"

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

/* ---------- STATIC MAPS ---------- */
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
  "Grade 10": "Use real-world scenarios and critical thinking, prepare for standardized exam complexity.",
  "Grade 11": "Prepare for standardized exams, expect deeper analysis and synthesis of concepts.",
  "Grade 12": "College-prep complexity, include evaluation tasks and advanced critical thinking.",
  "Undergraduate": "Assume foundational knowledge, emphasize application and analysis of complex scenarios.",
  "Graduate": "Expect advanced insight, synthesis, and research-level critical thinking with original analysis."
}

const bloomsDescriptions: Record<string,string> = {
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

/* ---------- IMAGE GENERATION HELPERS ---------- */
export const getImageInstructions = (enableImages: boolean): string => {
  if (!enableImages) return ""
  
  return `
IMAGE GENERATION INSTRUCTIONS:
When an image would significantly improve educational understanding, include image placeholders using this simple format:
[IMG: detailed_description]

Place the placeholder exactly where the image should appear (in question text, explanation, or option).

Examples:
- In question: "Count the apples in this picture: [IMG: Simple diagram showing exactly 4 red apples arranged in a row for counting exercise]"
- In explanation: "The lungs work like pumps. [IMG: Simple educational illustration of a child taking a deep breath, with dotted arrows showing air entering and exiting the lungs]"
- In option: "A) [IMG: Timeline showing major events from 1776-1800 with clear dates and labels]"

IMPORTANT IMAGE GUIDELINES:
- Only add images when they significantly enhance comprehension
- Use exact numbers and clear descriptions: "exactly 4 items" not "several items"  
- Focus on educational accuracy and clarity
- Keep image descriptions under 50 words each
- Specify educational illustration style: "simple educational diagram", "textbook illustration"
- Consider all subjects: math diagrams, science processes, historical timelines, geographic maps, literary illustrations
- Images are optional - only include when truly beneficial
- Place placeholder exactly where image should appear in the text
`
}

/* ---------- PROMPT BUILDER ---------- */
export const createAdvancedPrompt = (inputs: Inputs) => {
  const {
    subject, subSubject, topic, subTopic, grade, difficulty,
    bloomsLevel, totalQuestions, numMCQ, numFillBlank, numTrueFalse,
    numShortAnswer, numLongAnswer, pdfContent, additionalNotes, enableImages
  } = inputs

  const contextInfo = [
    `Subject: ${subject}${subSubject ? ` – ${subSubject}` : ""}`,
    `Topic: ${topic}${subTopic ? ` – ${subTopic}` : ""}`,
    `Grade Level: ${grade}`,
    `Difficulty: ${difficulty}`,
    `Bloom's Level: ${bloomsLevel}`,
    additionalNotes && `Teacher Notes: ${additionalNotes}`
  ].filter(Boolean).join("\n")

  const distributionInfo = `Generate exactly:
- ${numMCQ} multiple-choice questions
- ${numFillBlank} fill-in-the-blank questions
- ${numShortAnswer} short-answer questions
- ${numLongAnswer} long-answer questions
- ${numTrueFalse} true-false questions
  Total questions must equal ${totalQuestions}.`

  // Only include the specific grade context for the selected grade
  const gradeContext = gradeContexts[grade] 
    ? `Grade-Specific Guidelines for ${grade}:\n${gradeContexts[grade]}`
    : ""

  // Only include the specific Bloom's description for the selected level
  const bloomsContext = bloomsDescriptions[bloomsLevel]
    ? `Bloom's Taxonomy Level - ${bloomsLevel}:\n${bloomsDescriptions[bloomsLevel]}`
    : ""

  const pdfContext = pdfContent?.trim()
    ? `Reference the following content when crafting questions. Do NOT quote it verbatim. You may use it to ensure factual accuracy:\n"""${pdfContent.trim().slice(0, 50_000)}"""`
    : ""
  
  // Add image instructions based on user preference
  const imageInstructions = getImageInstructions(enableImages || false)
  
  // Dynamically include only relevant question type instructions
  const qTypeSections: string[] = []
  if (numMCQ > 0) qTypeSections.push(...questionTypeInstructions.mcq)
  if (numTrueFalse > 0) qTypeSections.push(...questionTypeInstructions.trueFalse)
  if (numFillBlank > 0) qTypeSections.push(...questionTypeInstructions.fillBlank)
  if (numShortAnswer > 0) qTypeSections.push(...questionTypeInstructions.shortAnswer)
  if (numLongAnswer > 0) qTypeSections.push(...questionTypeInstructions.longAnswer)

  // Only add question type section if there are specific instructions
  const questionTypeSection = qTypeSections.length > 0 
    ? ["Question Type Specific Instructions:", ...qTypeSections].join("\n")
    : ""

  const formattingRequirements = [
  // Output Structure & Format
  "Return ONLY valid JSON. No additional text before or after the JSON array.",
  "Return the result as a JSON array of question objects, even if there is only one question.",
  "Each question object must contain exactly these keys: type, question, options, correctAnswer, explanation.",
  
  // MCQ-specific formatting (only if MCQ requested)
  ...(numMCQ > 0 ? [
    "For multiple-choice questions:",
    "- options must be an array like: ['A) Option text', 'B) Option text', 'C) Option text', 'D) Option text']",
    "- correctAnswer field must be the option label only ('A', 'B', 'C', or 'D'), not the answer text"
  ] : []),

  // Content Quality Standards
  "Question Quality Requirements:",
  "- Each question must be clear, unambiguous, and age-appropriate for the specified grade level",
  "- Avoid trick questions, double negatives, or confusing wording", 
  "- Ensure questions test understanding, not memorization (unless specifically requested)",
  "- AVOID vague question starters like 'Imagine...', 'Picture this...', 'Think about...', 'Consider...'",
  
  // Question stems (conditional based on question types requested)
  ...(numMCQ > 0 ? [
    "- For MCQ: Use stems like 'Which of the following...', 'What is the primary...', 'How does...', 'Why is...', 'When does...'"
  ] : []),
  ...(numTrueFalse > 0 ? [
    "- For True/False: Use clear, factual statements that are definitively true or false"
  ] : []),
  ...(numFillBlank > 0 ? [
    "- For Fill-in-blank: Use direct statements with clear blanks: 'The _______ is...'"
  ] : []),
  ...(numShortAnswer > 0 || numLongAnswer > 0 ? [
    "- For Answer questions: Use direct, specific question stems: 'Explain how...', 'Describe why...', 'What are the main...'"
  ] : []),
  
  "- Questions should be concrete and factual rather than hypothetical scenarios",

  // Mathematical & Currency Formatting - CRITICAL RULES
  "Mathematical Expressions & Currency Symbols:",
  "- For mathematical expressions: Use single dollar signs: $x^2 + y^2 = z^2$, $18 + x = 45$, $\\frac{a}{b} = c$",
  "- For currency amounts: ALWAYS use escaped dollars: \\$45, \\$12.00, \\$0.75 (never use plain $ for money)",
  "- For variable references in text: Use math delimiters: the variable $x$ represents...",
  "",
  "CURRENCY FORMATTING EXAMPLES:",
  "✅ CORRECT: 'costs \\$45', 'saved \\$18', 'total of \\$15.00'", 
  "❌ WRONG: 'costs $45', 'saved $18' (creates math interpretation conflicts)",
  "",
  "MIXED CURRENCY & MATH EXAMPLES:",
  "✅ CORRECT: 'Jamie saved \\$18. The equation $18 + x = 45$ represents his situation.'",
  "❌ WRONG: 'Jamie saved $18. The equation $18 + x = 45$ represents his situation.'",
  "",
  "- Use Unicode symbols when appropriate: ₹, €, £, %, °C, π, ∞",
  "- Format large numbers with commas: 1,000,000 not 1000000",

  // Explanation Requirements  
  "Explanation Standards:",
  "- Keep explanations concise but complete (2-4 sentences ideal)",
  "- Explain WHY the correct answer is right, not just WHAT it is",
  ...(numMCQ > 0 ? ["- For MCQ: briefly explain why incorrect options are wrong when helpful"] : []),
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
  ${numMCQ > 0 ? '□ All MCQ have exactly 4 options (A, B, C, D) and correctAnswer is a single letter' : ''}
  ${numTrueFalse > 0 ? '□ All T/F have exactly 2 options [\'True\', \'False\'] and correctAnswer matches' : ''}
  `.split('\n').filter(line => line.trim() !== '').join('\n')

  return [
    "You are an expert assessment designer with deep knowledge of pedagogy and learning sciences.",
    
    `CONTEXT:\n${contextInfo}`,
    
    gradeContext,
    
    bloomsContext,
    
    pdfContext,
    
    imageInstructions, // Add image instructions when appropriate
    
    `QUESTION DISTRIBUTION REQUIREMENTS:\n${distributionInfo}`,
    
    formattingRequirements,
    
    questionTypeSection, // Only included if there are specific question type instructions
    
    validationInstructions
  ].filter(Boolean).join("\n\n")
}

/* ---------- AI CALL ---------- */
export const generateQuestions = async (inputs: Inputs) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createAdvancedPrompt(inputs)
  const res = await model.generateContent(prompt)
  return res.response?.text() ?? ""
}

export const generateNCERTQuestions = async (inputs: Inputs) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createNCERTPrompt(inputs)
  const res = await model.generateContent(prompt)
  return res.response?.text() ?? ""
}

/* ---------- LESSON PLAN AI FUNCTIONS ---------- */

/**
 * Extract learning objectives from PDF content
 */
export const extractLearningObjectives = async (
  pdfFile: File,
  subject: string,
  grade: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  // Convert PDF file to base64 for Gemini
  const arrayBuffer = await pdfFile.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')
  
  const prompt = createObjectiveExtractionPrompt(subject, grade)
  
  console.log("🔍 Processing PDF directly with Gemini for objective extraction")
  console.log("📄 PDF file size:", pdfFile.size, "bytes")
  
  const res = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: pdfFile.type
      }
    }
  ])
  
  const result = res.response?.text() ?? ""
  console.log("🤖 AI Objectives Response:", result)
  console.log("📊 Objectives Response length:", result.length)
  return result
}

/**
 * Generate lesson plan based on selected objective and parameters
 */
export const generateLessonPlan = async (
  formData: {
    subject: string;
    grade: string;
    sections: string[];
    pdfFile?: File;
    additionalNotes?: string;
  },
  selectedObjective: string,
  learnerLevel: 'beginner' | 'intermediate' | 'advanced',
  duration: 30 | 45 | 60
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createLessonPlanPrompt(formData, selectedObjective, learnerLevel, duration)
  console.log("🏗️ Generating lesson plan with direct PDF processing")
  
  let res;
  
  // Add PDF file directly to request if available
  if (formData.pdfFile) {
    const arrayBuffer = await formData.pdfFile.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    
    console.log("📄 Including PDF file in lesson plan generation:", formData.pdfFile.name)
    
    res = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: formData.pdfFile.type
        }
      }
    ])
  } else {
    // Fallback to text-only prompt if no PDF
    res = await model.generateContent(prompt)
  }
  
  const result = res.response?.text() ?? ""
  console.log("🤖 AI Raw Response:", result)
  console.log("📊 Response length:", result.length)
  return result
}