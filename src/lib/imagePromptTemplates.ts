/**
 * Educational Image Prompt Templates
 * Subject-specific templates for generating accurate educational images
 */

import type { ImageStyle } from '@/types/question'

// Subject-specific image requirements and styles
export const SUBJECT_IMAGE_STYLES: Record<string, ImageStyle> = {
  'Mathematics': 'mathematical_chart',
  'Science': 'scientific_diagram', 
  'Physics': 'technical_drawing',
  'Chemistry': 'scientific_diagram',
  'Biology': 'scientific_diagram',
  'Geography': 'educational_diagram',
  'History': 'educational_diagram',
  'English': 'simple_illustration'
}

// Educational prompt templates by content type
export const IMAGE_PROMPT_TEMPLATES = {
  // Mathematics templates
  counting: (count: number, object: string) => 
    `Simple educational illustration showing exactly ${count} ${object}, clearly arranged for counting exercise, high contrast, clean design`,
  
  geometry: (shape: string, properties?: string) =>
    `Clean geometric diagram of ${shape}${properties ? ` with ${properties}` : ''}, labeled angles and sides, mathematical textbook style, black lines on white background`,
  
  fractions: (numerator: number, denominator: number, object: string = 'circle') =>
    `Educational diagram showing ${object} divided into exactly ${denominator} equal parts with exactly ${numerator} parts highlighted, fraction visualization, simple and clear`,
  
  // Science templates  
  process: (processName: string, steps: string[]) =>
    `Scientific diagram showing ${processName} process with ${steps.length} clearly labeled steps: ${steps.join(', ')}, educational textbook illustration style`,
  
  anatomy: (organism: string, parts: string[]) =>
    `Cross-section anatomical diagram of ${organism} with clearly labeled parts: ${parts.join(', ')}, educational biology textbook style, simple line drawing`,
  
  molecule: (compound: string, atoms: string[]) =>
    `Molecular structure diagram of ${compound} showing ${atoms.join(' and ')} atoms with correct bonds, chemistry textbook style, clean and labeled`,
  
  // General educational templates
  comparison: (item1: string, item2: string, differences: string[]) =>
    `Side-by-side comparison diagram of ${item1} vs ${item2} highlighting differences: ${differences.join(', ')}, educational chart style`,
  
  lifecycle: (subject: string, stages: string[]) =>
    `Circular lifecycle diagram of ${subject} showing stages: ${stages.join(' → ')}, educational illustration with arrows and labels`,
  
  map: (location: string, features: string[]) =>
    `Simple educational map of ${location} showing key features: ${features.join(', ')}, clear labels, geography textbook style`
}

// Accuracy-focused modifiers for educational content
export const ACCURACY_MODIFIERS = {
  counting: ['exactly specified number', 'clearly countable', 'no ambiguous quantities'],
  measurements: ['accurate proportions', 'correct scale', 'precise dimensions'],
  scientific: ['scientifically accurate', 'correct terminology', 'proper labeling'],
  mathematical: ['mathematically correct', 'accurate angles', 'proper geometric properties'],
  anatomical: ['anatomically correct', 'proper positioning', 'accurate proportions']
}

// Quality modifiers for educational images
export const EDUCATIONAL_QUALITY_MODIFIERS = [
  'high contrast for clarity',
  'simple and unambiguous design',
  'educational textbook style',
  'clear and bold labels',
  'appropriate for grade level',
  'professional educational illustration'
]

/**
 * Generate educational image prompt based on content type and requirements
 */
export const generateEducationalPrompt = (
  contentType: string,
  parameters: Record<string, unknown>,
  subject: string,
  accuracyRequirements?: string[]
): string => {
  // Generate base prompt from template with type-safe parameter passing
  let prompt = ''
  
  switch (contentType) {
    case 'counting':
      prompt = IMAGE_PROMPT_TEMPLATES.counting(
        parameters.count as number, 
        parameters.object as string
      )
      break
    case 'geometry':
      prompt = IMAGE_PROMPT_TEMPLATES.geometry(
        parameters.shape as string, 
        parameters.properties as string
      )
      break
    case 'fractions':
      prompt = IMAGE_PROMPT_TEMPLATES.fractions(
        parameters.numerator as number, 
        parameters.denominator as number, 
        parameters.object as string
      )
      break
    case 'process':
      prompt = IMAGE_PROMPT_TEMPLATES.process(
        parameters.processName as string, 
        parameters.steps as string[]
      )
      break
    case 'anatomy':
      prompt = IMAGE_PROMPT_TEMPLATES.anatomy(
        parameters.organism as string, 
        parameters.parts as string[]
      )
      break
    case 'molecule':
      prompt = IMAGE_PROMPT_TEMPLATES.molecule(
        parameters.compound as string, 
        parameters.atoms as string[]
      )
      break
    case 'comparison':
      prompt = IMAGE_PROMPT_TEMPLATES.comparison(
        parameters.item1 as string, 
        parameters.item2 as string, 
        parameters.differences as string[]
      )
      break
    case 'lifecycle':
      prompt = IMAGE_PROMPT_TEMPLATES.lifecycle(
        parameters.subject as string, 
        parameters.stages as string[]
      )
      break
    case 'map':
      prompt = IMAGE_PROMPT_TEMPLATES.map(
        parameters.location as string, 
        parameters.features as string[]
      )
      break
    default:
      prompt = 'Educational illustration'
  }
  
  // Add quality modifiers
  const qualityModifiers = EDUCATIONAL_QUALITY_MODIFIERS.join(', ')
  
  // Add accuracy requirements if specified
  const accuracyText = accuracyRequirements?.length 
    ? `, ensuring ${accuracyRequirements.join(', ')}`
    : ''
  
  return `${prompt}, ${qualityModifiers}${accuracyText}`
}

/**
 * Extract accuracy requirements from question content
 */
export const extractAccuracyRequirements = (
  questionText: string,
  subject: string
): string[] => {
  const requirements: string[] = []
  
  // Look for specific numbers
  const numberMatches = questionText.match(/\b\d+\b/g)
  if (numberMatches) {
    requirements.push(`exactly ${numberMatches.join(', ')} items as specified`)
  }
  
  // Subject-specific requirements
  if (subject === 'Mathematics') {
    if (questionText.includes('angle')) requirements.push('correct angle measurements')
    if (questionText.includes('triangle')) requirements.push('valid triangle properties')
    if (questionText.includes('circle')) requirements.push('proper circular shape')
  }
  
  if (subject === 'Science' || subject === 'Biology') {
    if (questionText.includes('cell')) requirements.push('anatomically correct cell structure')
    if (questionText.includes('molecule')) requirements.push('correct molecular bonds')
  }
  
  return requirements
}

/**
 * Get appropriate image style for subject and content
 */
export const getImageStyleForContent = (
  subject: string, 
  contentType: string
): ImageStyle => {
  // Subject-specific styles
  const subjectStyle = SUBJECT_IMAGE_STYLES[subject]
  if (subjectStyle) return subjectStyle
  
  // Content-type specific defaults
  if (contentType.includes('diagram') || contentType.includes('process')) {
    return 'scientific_diagram'
  }
  
  if (contentType.includes('chart') || contentType.includes('graph')) {
    return 'mathematical_chart'
  }
  
  return 'educational_diagram'
}

/**
 * Validate image prompt for educational accuracy
 */
export const validateEducationalPrompt = (prompt: string): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} => {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Check for vague quantities
  if (prompt.match(/\b(some|few|many|several)\b/i)) {
    issues.push('Contains vague quantities')
    suggestions.push('Use exact numbers instead of "some", "few", "many"')
  }
  
  // Check for educational keywords
  const educationalKeywords = ['educational', 'diagram', 'illustration', 'clear', 'simple']
  if (!educationalKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
    issues.push('Missing educational context keywords')
    suggestions.push('Add keywords like "educational", "diagram", or "textbook style"')
  }
  
  // Check prompt length (should be under 480 tokens ~ 350 words)
  if (prompt.length > 300) {
    issues.push('Prompt may be too long')
    suggestions.push('Shorten prompt to under 300 characters for better results')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

/* ========== EXPORTS ========== */

const imagePromptTemplates = {
  SUBJECT_IMAGE_STYLES,
  IMAGE_PROMPT_TEMPLATES,
  ACCURACY_MODIFIERS,
  EDUCATIONAL_QUALITY_MODIFIERS,
  generateEducationalPrompt,
  extractAccuracyRequirements,
  getImageStyleForContent,
  validateEducationalPrompt
}

export default imagePromptTemplates