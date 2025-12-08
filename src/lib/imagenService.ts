/**
 * Google Imagen API Integration for Educational Image Generation
 * Uses imagen-4.0-fast-generate-001 model for educational content
 */

import { GoogleGenAI, PersonGeneration } from "@google/genai"
import type { ImageGenerationConfig } from '@/types/question'

// Initialize Imagen with the correct SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!
})

// Default configuration for educational images
const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  numberOfImages: 1,        // Generate one image for cost efficiency
  imageSize: '1K',          // 1K resolution sufficient for educational use
  aspectRatio: '1:1',       // Square format for versatility
  personGeneration: 'dont_allow' // Safety for educational content
}

/**
 * Generate educational image using Imagen API
 */
export const generateEducationalImage = async (
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
    // Validate prompt length (Imagen has 480 token limit)
    if (prompt.length > 400) {
      console.warn('⚠️ Prompt may be too long for Imagen API:', prompt.length, 'characters')
    }

    // Merge config with defaults
    const finalConfig: ImageGenerationConfig = {
      ...DEFAULT_IMAGE_CONFIG,
      ...config
    }

    console.log('🎨 Generating educational image with Imagen')
    console.log('📝 Prompt:', prompt)
    console.log('⚙️ Config:', finalConfig)

    // Generate image using the correct Imagen API
    // Note: imageSize is only supported for Standard and Ultra models, not Fast
    const response = await genAI.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: finalConfig.numberOfImages,
        aspectRatio: finalConfig.aspectRatio,
        personGeneration: PersonGeneration.DONT_ALLOW
        // imageSize is not supported for Fast model
      }
    })
    
    console.log('🖼️ Image generation response received')
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error('No images were generated')
    }
    
    // Get the first generated image
    const generatedImage = response.generatedImages[0]
    
    // Convert base64 image bytes to data URL
    if (!generatedImage.image) {
      throw new Error('Generated image data is missing')
    }
    
    const imageBytes = generatedImage.image.imageBytes
    const imageUrl = `data:image/png;base64,${imageBytes}`
    
    return {
      success: true,
      imageUrl,
      metadata: {
        prompt,
        model: 'imagen-4.0-fast-generate-001',
        config: finalConfig,
        generatedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('❌ Error generating educational image:', error)
    
    // Handle specific Imagen API errors
    let errorMessage = 'Unknown error occurred during image generation'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Handle common Imagen errors
      if (errorMessage.includes('quota')) {
        errorMessage = 'Image generation quota exceeded. Please try again later.'
      } else if (errorMessage.includes('content policy')) {
        errorMessage = 'Image prompt violates content policy. Please modify your request.'
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Imagen model not available. Please check your API access.'
      }
    }

    return {
      success: false,
      error: errorMessage
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

  // Check prompt length (Imagen limit: 480 tokens ≈ 350-400 characters)
  if (prompt.length > 400) {
    issues.push('Prompt too long (over 400 characters)')
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
 * Retry image generation with improved prompt
 */
export const retryImageGeneration = async (
  originalPrompt: string,
  previousError: string,
  config?: Partial<ImageGenerationConfig>
) => {
  console.log('🔄 Retrying image generation with improved prompt')
  
  // Improve prompt based on previous error
  let improvedPrompt = originalPrompt

  if (previousError.includes('too complex')) {
    improvedPrompt = `Simple ${originalPrompt.replace(/complex|detailed|intricate/gi, 'basic')}`
  } else if (previousError.includes('unclear')) {
    improvedPrompt = `Clear, high-contrast ${originalPrompt}, bold lines, simple design`
  } else if (previousError.includes('inappropriate')) {
    improvedPrompt = `Educational textbook illustration: ${originalPrompt.replace(/[^a-zA-Z0-9\s]/g, '')}`
  } else if (previousError.includes('not found') || previousError.includes('404')) {
    // For API errors, keep the prompt but add educational context
    improvedPrompt = `Educational diagram: ${originalPrompt}, simple and clear for students`
  } else {
    improvedPrompt = `Educational illustration: ${originalPrompt}, clear and simple`
  }

  console.log('📝 Improved prompt:', improvedPrompt)
  
  return await generateEducationalImage(improvedPrompt, config)
}

/**
 * Generate multiple variations of the same educational concept
 */
export const generateImageVariations = async (
  basePrompt: string,
  variations: string[],
  config?: Partial<ImageGenerationConfig>
): Promise<{
  success: boolean
  results: Array<{
    variation: string
    imageUrl?: string
    error?: string
  }>
  error?: string
}> => {
  try {
    const results = []

    for (const variation of variations) {
      const fullPrompt = `${basePrompt}, ${variation}`
      const result = await generateEducationalImage(fullPrompt, config)
      
      results.push({
        variation,
        imageUrl: result.imageUrl,
        error: result.error
      })

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: true,
      results
    }

  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Estimate image generation cost (placeholder for future implementation)
 */
export const estimateImageCost = (
  numberOfImages: number,
  imageSize: '1K' | '2K' = '1K'
): {
  estimatedCost: number
  currency: string
  breakdown: string
} => {
  // Placeholder costs - update with actual Imagen pricing
  const costPer1K = 0.10 // Example: $0.10 per 1K image
  const costPer2K = 0.20 // Example: $0.20 per 2K image
  
  const unitCost = imageSize === '1K' ? costPer1K : costPer2K
  const totalCost = numberOfImages * unitCost

  return {
    estimatedCost: totalCost,
    currency: 'USD',
    breakdown: `${numberOfImages} ${imageSize} images × $${unitCost} = $${totalCost.toFixed(2)}`
  }
}

/* ========== EXPORTS ========== */

const imagenService = {
  generateEducationalImage,
  validateImagePrompt,
  retryImageGeneration,
  generateImageVariations,
  estimateImageCost,
  DEFAULT_IMAGE_CONFIG
}

export default imagenService