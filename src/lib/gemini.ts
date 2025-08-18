import { GoogleGenerativeAI } from "@google/generative-ai"
import { Inputs } from "@/components/AdvancedQuestionForm"

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

/* ---------- STATIC MAPS ---------- */
const gradeContexts: Record<string,string> = {
  "Kindergarten": "Use very simple language...",
  "Grade 1": "Use simple vocabulary...",
  "Grade 2": "Use 1-2 sentence explanations...",
  "Grade 3": "Use age-appropriate language...",
  "Grade 4": "Introduce multi-step reasoning...",
  "Grade 5": "Use moderate vocabulary...",
  "Grade 6": "Ensure concepts are concrete and relatable...",
  "Grade 7": "Bridge concrete to abstract ideas...",
  "Grade 8": "Encourage analytical thinking...",
  "Grade 9": "Introduce foundational high-school rigor...",
  "Grade 10": "Use real-world scenarios and critical thinking...",
  "Grade 11": "Prepare for standardized exams; deeper analysis...",
  "Grade 12": "College-prep complexity; include evaluation tasks...",
  "Undergraduate": "Assume foundational knowledge; emphasize application...",
  "Graduate": "Expect advanced insight, synthesis, and research-level prompts..."
}

const bloomsDescriptions: Record<string,string> = {
  Remember: "Recall facts, definitions, and basic concepts.",
  Understand: "Explain ideas or concepts in own words.",
  Apply: "Use information in new but similar situations.",
  Analyze: "Break information into parts and explore relationships.",
  Evaluate: "Justify decisions or opinions with evidence.",
  Create: "Produce original work or propose novel solutions."
}

/* ---------- PROMPT BUILDER ---------- */
export const createAdvancedPrompt = (inputs: Inputs) => {
  const {
    subject, subSubject, topic, subTopic, grade, difficulty,
    bloomsLevel, totalQuestions, numMCQ, numFillBlank,
    numShortAnswer, numLongAnswer, pdfContent, additionalNotes
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
Total questions must equal ${totalQuestions}.`

  const gradeContext = gradeContexts[grade] ?? ""
  const bloomsContext = bloomsDescriptions[bloomsLevel] ?? ""

  const pdfContext = pdfContent?.trim()
    ? `Reference the following content when crafting questions. Do NOT quote it verbatim. You may use it to ensure factual accuracy:\n"""${pdfContent.trim().slice(0, 50_000)}"""`
    : ""

  return [
    "You are an expert assessment designer.",
    gradeContext,
    `Target Bloom's description: ${bloomsContext}`,
    contextInfo,
    pdfContext,
    distributionInfo,
    "Formatting requirements:",
    "Use Unicode characters (e.g., ₹) and standard LaTeX for math, wrapped in single dollar signs ($...$). Avoid encoding artifacts.",
    "When writing dollar currency, always use text to represent dollars (e.g., USD $45 or 45 dollars). Do not use single dollar signs for currency.",
    "All fields must be plain text or Markdown, and explanations should be concise but clear.",
    "Provide each question followed immediately by its correct answer and a brief explanation, separated clearly.",
    "Return the result as structured JSON with keys: type, question, options (if MCQ), correctAnswer, explanation.",
    "Return the result as a JSON array of question objects, even if there is only one Question",
    "For multiple-choice questions - The 'correctAnswer' field must be the option label only (e.g., 'A', 'B', etc.), not the answer text.",
  ].filter(Boolean).join("\n\n")
}

/* ---------- AI CALL ---------- */
export const generateQuestions = async (inputs: Inputs) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createAdvancedPrompt(inputs)

  const res = await model.generateContent(prompt)
  return res.response?.text() ?? ""
}
