import { GoogleGenerativeAI } from "@google/generative-ai"
import { Inputs } from "@/components/AdvancedQuestionForm"
import { createNCERTPrompt } from "@/lib/ncertPrompt"
import { createObjectiveExtractionPrompt, createLessonPlanPrompt } from "@/lib/lessonPlanPrompt"

// NEW: Interface for AI generation result with prompt tracking
export interface GenerationResult {
  text: string
  prompt: string
}

// Use server-side API key (no referrer restrictions) or fall back to public key
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY_SERVER || process.env.NEXT_PUBLIC_GEMINI_API_KEY!
)

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

/* ---------- IMAGE GENERATION HELPERS ---------- */
export const getImageInstructions = (enableImages: boolean): string => {
  if (!enableImages) return ""
  
  return `
IMAGE PLACEHOLDER FORMAT:
When an image would significantly improve educational understanding, include placeholders using:
[IMG: your_detailed_description]

The text inside [IMG: ...] becomes the prompt for image generation. Write it as a standalone, descriptive paragraph—not just keywords. The system will add educational style modifiers automatically. Place the placeholder exactly where the image should appear (question, explanation, or option).

CORE PRINCIPLES (for best image quality):
- Describe the scene as a narrative, don't just list keywords. Use descriptive sentences.
- Be hyper-specific: "exactly 5 red apples in a row" not "some apples"; "labeled axes from 0 to 10 with tick marks at each integer" not "a number line".
- Include composition/style: "textbook diagram", "educational illustration", "simple line drawing", "clean black lines on white background".
- Specify spatial relationships and layout: where elements are positioned, how they connect, what is labeled.
- Leverage text rendering: Gemini 3 Pro Image can accurately render text in images.

SUBJECT-SPECIFIC GUIDELINES:

Mathematics (number lines, charts, geometric figures, equations):
- Describe layout: "horizontal number line from 0 to 10", "coordinate plane with x-axis from -5 to 5 and y-axis from 0 to 10".
- Specify tick marks, grid lines, labels: "tick marks at each integer", "grid with 1-unit spacing", "labeled origin point".
- Use exact values: "exactly 4 equal parts shaded", "triangle with angles 60°, 60°, and 60°".
- Text rendering: "equation y = 2x + 3 displayed clearly", "labeled vertices A, B, C".
- Style: "minimal textbook diagram", "clean geometric figure", "black lines on white background", "mathematical chart with clear axes".
- Example: [IMG: Horizontal number line from 0 to 10 with tick marks at each integer and bold labels at 0, 5, and 10. Clean black lines on white background, minimal textbook diagram style for teaching place value.]

Science (cells, molecules, processes, cycles, labeled diagrams):
- Specify all text/labels to appear: "labels showing nucleus, mitochondria, cell membrane", "chemical formula H₂O", "arrows indicating flow direction".
- Describe structure and connections: "cross-section showing three layers", "arrows connecting four stages in a cycle", "bonds between carbon and hydrogen atoms".
- Layout: "centered cell with organelles labeled around the perimeter", "left-to-right process flow".
- Text rendering: "clearly labeled parts with sans-serif text", "chemical equation with proper subscripts", "step labels: Step 1, Step 2, Step 3".
- Style: "educational biology textbook illustration", "scientific diagram with clear labels", "chemistry textbook style with accurate molecular structure".
- Example: [IMG: Labeled cross-section diagram of a plant cell showing cell wall (outer layer), large central vacuole, nucleus (center), chloroplasts (green ovals), and cell membrane. Labels in clear sans-serif font with arrows pointing to each organelle. White background, textbook illustration style for Grade 7 biology.]

Other subjects (history, geography, social studies):
- Timelines: "horizontal timeline from 1776 to 1865 with 5 major events labeled", "arrows showing sequence".
- Maps: "simple map of India showing 5 neighboring countries with clear labels", "compass rose in corner".
- Comparisons: "side-by-side comparison showing differences between X and Y with bullet points".
- Use the same principles: narrative, specific, include style and text rendering details.

EXAMPLES BY PLACEMENT:

Question context:
"Count the objects in this picture: [IMG: Simple illustration showing exactly 6 blue circles arranged in two rows of 3, high contrast, clean design for counting exercise, educational style suitable for Grade 2.]"

Explanation context:
"The water cycle repeats continuously. [IMG: Circular diagram showing the water cycle with 4 labeled stages: Evaporation (water rising from ocean), Condensation (clouds forming), Precipitation (rain falling), and Collection (water returning to ocean). Arrows connect each stage clockwise. Educational textbook style with clear labels and soft blue color palette.]"

Option context:
"Which graph shows exponential growth? A) [IMG: Line graph with labeled x-axis (Time: 0-10) and y-axis (Value: 0-100), showing exponential curve rising steeply, clean mathematical chart style with grid lines.]"

IMPORTANT GUIDELINES:
- Word limit: 100-150 words per image description
- Use exact numbers and measurements, avoid vague terms like "several", "some", "a few"
- Leverage text rendering: specify equations, labels, formulas as they should appear
- Describe layout and spatial relationships clearly
- Include style descriptors in every prompt
- Images are optional - only include when they significantly enhance comprehension
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

  return [
    "You are an expert assessment designer with deep knowledge of pedagogy and learning sciences.",
    
    `CONTEXT:\n${contextInfo}`,
    
    gradeContext,
    
    bloomsContext,
    
    pdfContext,
    
    imageInstructions, // Add image instructions when appropriate
    
    `QUESTION DISTRIBUTION REQUIREMENTS:\n${distributionInfo}`,
    
    formattingRequirements,
    
    markdownReference, // Markdown formatting reference moved here as separate section
    
    questionTypeSection, // Only included if there are specific question type instructions
    
  ].filter(Boolean).join("\n\n")
}

/* ---------- AI CALL ---------- */
export const generateQuestions = async (inputs: Inputs, pdfFileUri?: string): Promise<GenerationResult> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createAdvancedPrompt(inputs)
  
  // If PDF file reference is provided, include it in the request
  if (pdfFileUri) {
    const parts = [
      prompt,
      {
        fileData: {
          fileUri: pdfFileUri,
          mimeType: 'application/pdf'
        }
      }
    ]
    const res = await model.generateContent(parts)
    const text = res.response?.text() ?? ""
    return { text, prompt }  // NEW: Return both text and prompt
  }
  
  // Otherwise, generate without PDF
  const res = await model.generateContent(prompt)
  const text = res.response?.text() ?? ""
  return { text, prompt }  // NEW: Return both text and prompt
}

export const generateNCERTQuestions = async (inputs: Inputs, pdfFileUri?: string): Promise<GenerationResult> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createNCERTPrompt(inputs)
  
  // If PDF file reference is provided, include it in the request
  if (pdfFileUri) {
    const parts = [
      prompt,
      {
        fileData: {
          fileUri: pdfFileUri,
          mimeType: 'application/pdf'
        }
      }
    ]
    const res = await model.generateContent(parts)
    const text = res.response?.text() ?? ""
    return { text, prompt }  // NEW: Return both text and prompt
  }
  
  // Otherwise, generate without PDF
  const res = await model.generateContent(prompt)
  const text = res.response?.text() ?? ""
  return { text, prompt }  // NEW: Return both text and prompt
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
  
  let res;
  
  // Add PDF file directly to request if available
  if (formData.pdfFile) {
    const arrayBuffer = await formData.pdfFile.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    
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
  return result
}

/**
 * Generate quiz game configuration from topic
 */
export const generateQuizGame = async (
  topic: string,
  subject?: string,
  grade?: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  numberOfQuestions: number = 10,
  timeLimit?: number,
  enableImages: boolean = false,
  distribution?: { mcq: number; trueFalse: number; fib: number }
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  const gradeContext = grade && gradeContexts[grade] 
    ? `\nGrade-Specific Context (${grade}): ${gradeContexts[grade]}`
    : ""

  const imageInstructions = getImageInstructions(enableImages)
  
  // Default distribution if not provided (all MCQ for backward compatibility)
  const dist = distribution || { mcq: numberOfQuestions, trueFalse: 0, fib: 0 };
  
  // Build question type instructions dynamically
  let questionTypeInstructions = '';
  let questionTypeList = '';
  const examples: string[] = [];
  
  // Only include instructions for requested types
  if (dist.mcq > 0) {
    questionTypeList += `- ${dist.mcq} Multiple Choice (MCQ) questions with 4 options\n`;
    questionTypeInstructions += `
Each MCQ question MUST have:
- Clear, educational question text
- Exactly 4 options (A, B, C, D)
- ONE correct answer (letter only: A, B, C, or D)
- Educational explanation (2-3 sentences)
- "question_type": "MCQ"
- All distractors must be plausible but clearly incorrect
`;
    
    examples.push(`{
      "question": "What is the capital of France?",
      "question_type": "MCQ",
      "options": ["A) London", "B) Paris", "C) Berlin", "D) Madrid"],
      "correct_answer": "B",
      "explanation": "Paris is the capital and largest city of France.",
      "hint": "This city is known as the City of Light and is home to the Eiffel Tower.",
      "difficulty": "${difficulty || 'medium'}",
      "points": 100
    }`);
  }
  
  if (dist.trueFalse > 0) {
    questionTypeList += `- ${dist.trueFalse} True/False questions\n`;
    questionTypeInstructions += `
Each True/False question MUST have:
- Clear statement to evaluate as true or false
- 2 options: ["True", "False"]
- Correct answer: "True" or "False" (exact match, case-sensitive)
- Explanation why it's true or false (2-3 sentences)
- "question_type": "True/False"
`;
    
    examples.push(`{
      "question": "The Earth orbits around the Sun.",
      "question_type": "True/False",
      "options": ["True", "False"],
      "correct_answer": "True",
      "explanation": "The Earth takes approximately 365.25 days to complete one orbit around the Sun.",
      "hint": "Think about what is at the center of our solar system.",
      "difficulty": "${difficulty || 'medium'}",
      "points": 100
    }`);
  }
  
  if (dist.fib > 0) {
    questionTypeList += `- ${dist.fib} Fill in the Blank (FIB) questions\n`;
    questionTypeInstructions += `
Each FIB question MUST have:
- Question with EXACTLY ONE blank (use "______" to indicate the blank)
- NO options field (completely omit the "options" key)
- correct_answer: the exact text answer (single word or short phrase)
- Explanation (2-3 sentences)
- "question_type": "FIB"
- "case_sensitive": false
- CRITICAL: Only ONE blank per question - do not create questions with multiple blanks
- The answer should be a single word or short phrase (2-3 words max)
`;
    
    examples.push(`{
      "question": "The chemical symbol for water is ______.",
      "question_type": "FIB",
      "correct_answer": "H2O",
      "explanation": "Water's chemical formula is H2O, consisting of two hydrogen atoms and one oxygen atom.",
      "hint": "It consists of 2 hydrogen atoms and 1 oxygen atom.",
      "difficulty": "${difficulty || 'medium'}",
      "points": 100,
      "case_sensitive": false
    }`);
  }

  const prompt = `Generate a quiz game configuration for an educational game platform.

CONTEXT:
Topic: ${topic}${subject ? `\nSubject: ${subject}` : ""}${gradeContext}
Difficulty: ${difficulty || 'medium'}
Total Questions: ${numberOfQuestions}${timeLimit ? `\nTime Limit: ${timeLimit} seconds` : ""}

QUIZ GAME REQUIREMENTS:
Generate EXACTLY ${numberOfQuestions} questions about "${topic}" with the following distribution:
${questionTypeList}
${questionTypeInstructions}

Question Quality Standards:
- Questions should test understanding, not just memorization
- Use concrete, factual questions rather than hypothetical scenarios
- Avoid trick questions, double negatives, or confusing wording
- Questions should be age-appropriate for the grade level
- Use clear question stems: "Which of the following...", "What is...", "How does...", "Why is..."
- AVOID vague starters like "Imagine...", "Picture this...", "Think about..."
- EVERY question must include a helpful hint (1 sentence that guides without revealing the answer)

${imageInstructions}

Mathematical & Currency Formatting:
- For mathematical expressions: Use single dollar signs: $x^2 + y^2 = z^2$, $\\frac{a}{b} = c$
- For currency amounts: ALWAYS use escaped dollars: \\$45, \\$12.00, \\$0.75
- Use Unicode symbols when appropriate: ₹, €, £, %, °C, π, ∞

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure (no additional text before or after):

{
  "questions": [
    ${examples.join(',\n    ')}
  ],
  "settings": {
    "time_limit": ${timeLimit || 300},
    "lives": 3,
    "hints_enabled": true,
    "show_explanations": true
  }
}

CRITICAL JSON RULES:
- Return ONLY the JSON object, no markdown code blocks, no additional text
- title: Create a concise, engaging title (5-10 words). DO NOT include 'Quiz' suffix as game_type already identifies this as a quiz
- description: One clear sentence describing the quiz content and scope
- question_type must be exactly: "MCQ", "True/False", or "FIB" (case-sensitive)
- MCQ: options array required with 4 items, correct_answer is letter (A, B, C, or D)
- True/False: options array required ["True", "False"], correct_answer is "True" or "False"
- FIB: NO options field (completely omit it), correct_answer is the text answer, ONLY ONE BLANK per question
- Generate EXACTLY ${numberOfQuestions} questions in the specified distribution (${dist.mcq} MCQ, ${dist.trueFalse} True/False, ${dist.fib} FIB)
- All string values must use double quotes
- points should be 100 for all questions
- hint must be provided for EVERY question (1 sentence, helpful guidance without revealing the answer)
- Ensure valid JSON syntax (no trailing commas, proper escaping)
- settings must be an object with time_limit, lives, hints_enabled, show_explanations

Generate the quiz game now:`
  
  const res = await model.generateContent(prompt)
  const result = res.response?.text() ?? ""
  
  return result
}