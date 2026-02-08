/**
 * Client-Side Gemini 3 Pro Image API Integration for Educational Image Generation
 * Uses the same approach as question generation (client-side execution)
 * Uses gemini-3-pro-image-preview model for educational content
 * Supports longer prompts (65K tokens), better text rendering, and 1K/2K resolution
 */

import { GoogleGenAI, PersonGeneration } from "@google/genai"
import type { ImageGenerationConfig } from '@/types/question'

// Initialize Gemini with the same pattern as question generation
const genAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!
})

// Default configuration for educational images
const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  numberOfImages: 1,        // Generate one image for cost efficiency
  imageSize: '2K',          // 2K resolution for better quality with text rendering
  aspectRatio: '1:1',       // Square format for versatility
  personGeneration: 'dont_allow' // Safety for educational content
}

/**
 * Generate educational image using Gemini 3 Pro Image API (CLIENT-SIDE)
 * This runs in the browser, just like question generation
 */
export const generateEducationalImageClient = async (
  prompt: string,
  config?: Partial<ImageGenerationConfig>
): Promise<{
  success: boolean
  imageUrl?: string
  imageBlob?: Blob
  metadata?: {
    prompt: string
    model: string
    config: ImageGenerationConfig
    generatedAt: string
  }
  error?: string
}> => {
  try {
    // Validate prompt length (Gemini 3 Pro Image supports 65K tokens - much more flexible)
    if (prompt.length > 1500) {
      console.warn('⚠️ Prompt is very long:', prompt.length, 'characters (consider keeping under 1500 for optimal results)')
    }

    // Merge config with defaults
    const finalConfig: ImageGenerationConfig = {
      ...DEFAULT_IMAGE_CONFIG,
      ...config
    }

    // Generate image using Gemini 3 Pro Image API with multimodal support
    const response = await genAI.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: finalConfig.aspectRatio,
          imageSize: finalConfig.imageSize || '2K'  // Default to 2K for better text rendering
        }
      }
    })
    
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates generated')
    }
    
    const candidate = response.candidates[0]
    if (!candidate?.content?.parts) {
      throw new Error('Response candidate missing content or parts')
    }
    
    // Find image part in multimodal response
    let imageBytes = null
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.mimeType?.includes('image')) {
        imageBytes = part.inlineData.data  // base64
        break
      }
    }
    
    if (!imageBytes) {
      throw new Error('No image data found in response - model may not have generated an image')
    }
    
    const imageUrl = `data:image/png;base64,${imageBytes}`
    
    // Convert base64 to blob for upload
    const byteCharacters = atob(imageBytes)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const imageBlob = new Blob([byteArray], { type: 'image/png' })
    
    return {
      success: true,
      imageUrl,
      imageBlob,
      metadata: {
        prompt,
        model: 'gemini-3-pro-image-preview',
        config: finalConfig,
        generatedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('❌ Error generating educational image (CLIENT-SIDE):', error)
    
    // Handle specific Gemini API errors
    let errorMessage = 'Unknown error occurred during image generation'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Handle common Gemini API errors
      if (errorMessage.includes('quota')) {
        errorMessage = 'Image generation quota exceeded. Please try again later.'
      } else if (errorMessage.includes('content policy') || errorMessage.includes('safety')) {
        errorMessage = 'Image prompt violates content policy. Please modify your request.'
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        errorMessage = 'Gemini 3 Pro Image model not available. Please check your API access.'
      } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
        errorMessage = 'API access denied. Please check your API key configuration and model access.'
      } else if (errorMessage.includes('No image data found')) {
        errorMessage = 'Model did not generate an image. Try rephrasing your prompt or simplifying the description.'
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Upload generated image to Supabase Storage (CLIENT-SIDE)
 */
export const uploadGeneratedImage = async (
  imageBlob: Blob,
  filename: string,
  questionId: string | number,
  promptId: string,
  accessToken: string
): Promise<{
  success: boolean
  url?: string
  error?: string
}> => {
  try {
    // Create form data for upload
    const formData = new FormData()
    formData.append('image', imageBlob, filename)
    formData.append('questionId', questionId.toString())
    formData.append('promptId', promptId)
    
    // Upload to our API endpoint
    const response = await fetch('/api/images/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }
    
    return {
      success: true,
      url: result.url
    }
    
  } catch (error) {
    console.error('❌ Error uploading image (CLIENT-SIDE):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Complete client-side image generation and storage workflow
 */
export const generateAndSaveImage = async (
  prompt: string,
  questionId: string | number,
  promptId: string,
  accessToken: string,
  config?: Partial<ImageGenerationConfig>
): Promise<{
  success: boolean
  imageUrl?: string
  imageRecord?: Record<string, unknown>
  error?: string
}> => {
  try {
    // Step 1: Generate image
    const generationResult = await generateEducationalImageClient(prompt, config)
    
    if (!generationResult.success || !generationResult.imageBlob) {
      return {
        success: false,
        error: generationResult.error || 'Image generation failed'
      }
    }
    
    // Step 2: Upload image
    const filename = `generated_${Date.now()}.png`
    const uploadResult = await uploadGeneratedImage(
      generationResult.imageBlob,
      filename,
      questionId,
      promptId,
      accessToken
    )
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Image upload failed'
      }
    }
    
    // Step 3: Save image record to database
    const imageRecord = await saveImageRecord(
      promptId,
      uploadResult.url!,
      generationResult.metadata?.prompt || prompt, // Enhanced prompt used for generation
      prompt, // Original description for alt_text
      accessToken,
      generationResult.metadata
    )
    
    if (!imageRecord.success) {
      return {
        success: false,
        error: imageRecord.error || 'Failed to save image record'
      }
    }
    
    return {
      success: true,
      imageUrl: uploadResult.url,
      imageRecord: imageRecord.data
    }
    
  } catch (error) {
    console.error('❌ Error in complete image workflow (CLIENT-SIDE):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Save image record to database
 */
const saveImageRecord = async (
  promptId: string,
  imageUrl: string,
  promptUsed: string,
  originalDescription: string,
  accessToken: string,
  metadata?: Record<string, unknown>
): Promise<{
  success: boolean
  data?: Record<string, unknown>
  error?: string
}> => {
  try {
    const response = await fetch('/api/images/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        prompt_id: promptId,
        image_url: imageUrl,
        prompt_used: promptUsed,
        original_description: originalDescription,
        metadata
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save image record: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result
    
  } catch (error) {
    console.error('❌ Error saving image record:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save image record'
    }
  }
}

/**
 * Validate educational image prompt before generation
 */
export const validateImagePrompt = (prompt: string): {
  isValid: boolean
  issues: string[]
  optimizedPrompt?: string
} => {
  const issues: string[] = []
  let optimizedPrompt = prompt

  // Check prompt length (Gemini 3 Pro Image supports 65K tokens - very flexible)
  // Warn only if extremely long (over 1500 characters)
  if (prompt.length > 1500) {
    issues.push('Prompt is very long (over 1500 characters) - consider simplifying for optimal results')
  }

  // Check for inappropriate content for educational use
  const inappropriateTerms = ['violent', 'scary', 'inappropriate', 'adult']
  const hasInappropriateContent = inappropriateTerms.some(term => 
    prompt.toLowerCase().includes(term)
  )
  
  if (hasInappropriateContent) {
    issues.push('Prompt contains inappropriate content for educational use')
  }

  // Check for vague terms that might cause inaccuracy
  const vagueTerms = ['some', 'few', 'many', 'several', 'a lot']
  const hasVagueTerms = vagueTerms.some(term => 
    prompt.toLowerCase().includes(term)
  )
  
  if (hasVagueTerms) {
    issues.push('Prompt contains vague quantities that may cause inaccuracy')
    
    // Suggest optimization
    optimizedPrompt = prompt.replace(/\b(some|few|many|several|a lot)\b/gi, 'specific number of')
  }

  // Ensure educational context
  const educationalKeywords = ['educational', 'textbook', 'diagram', 'illustration', 'simple']
  const hasEducationalContext = educationalKeywords.some(keyword =>
    prompt.toLowerCase().includes(keyword)
  )

  if (!hasEducationalContext) {
    issues.push('Missing educational context keywords')
    optimizedPrompt = `Educational ${optimizedPrompt}`
  }

  return {
    isValid: issues.length === 0,
    issues,
    optimizedPrompt: issues.length > 0 ? optimizedPrompt : undefined
  }
}

/**
 * Retry image generation with improved prompt (CLIENT-SIDE)
 */
export const retryImageGeneration = async (
  originalPrompt: string,
  previousError: string,
  questionId: string | number,
  promptId: string,
  accessToken: string,
  config?: Partial<ImageGenerationConfig>
) => {
  // Improve prompt based on previous error
  let improvedPrompt = originalPrompt

  if (previousError.includes('too complex')) {
    improvedPrompt = `Simple ${originalPrompt.replace(/complex|detailed|intricate/gi, 'basic')}`
  } else if (previousError.includes('unclear')) {
    improvedPrompt = `Clear, high-contrast ${originalPrompt}, bold lines, simple design`
  } else if (previousError.includes('inappropriate')) {
    improvedPrompt = `Educational textbook illustration: ${originalPrompt.replace(/[^a-zA-Z0-9\s]/g, '')}`
  } else if (previousError.includes('not found') || previousError.includes('404')) {
    improvedPrompt = `Educational diagram: ${originalPrompt}, simple and clear for students`
  } else {
    improvedPrompt = `Educational illustration: ${originalPrompt}, clear and simple`
  }
  
  return await generateAndSaveImage(improvedPrompt, questionId, promptId, accessToken, config)
}

/* ========== EXPORTS ========== */

const imagenClientService = {
  generateEducationalImageClient,
  uploadGeneratedImage,
  generateAndSaveImage,
  validateImagePrompt,
  retryImageGeneration,
  DEFAULT_IMAGE_CONFIG
}

export default imagenClientService