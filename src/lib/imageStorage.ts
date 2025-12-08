import { supabase } from './supabase'

/**
 * Image storage utilities for Supabase Storage
 * Handles upload, download, and deletion of generated educational images
 */

// Storage bucket name for images
const IMAGES_BUCKET = 'images'

// Helper function for error handling
const getStorageErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message)
  }
  return 'Unknown storage error occurred'
}

/**
 * Upload image to Supabase Storage
 */
export const uploadImage = async (
  file: File | Blob,
  filePath: string,
  options?: {
    cacheControl?: string
    contentType?: string
  }
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || 'image/png'
      })

    if (error) {
      console.error('Error uploading image:', error)
      return { success: false, error: getStorageErrorMessage(error) }
    }

    // Get public URL for the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(data.path)

    console.log(`✅ Successfully uploaded image: ${filePath}`)
    return { 
      success: true, 
      url: publicUrlData.publicUrl 
    }

  } catch (err) {
    console.error('Unexpected error uploading image:', err)
    return { 
      success: false, 
      error: getStorageErrorMessage(err) 
    }
  }
}

/**
 * Upload image from URL (for Imagen generated images)
 */
export const uploadImageFromUrl = async (
  imageUrl: string,
  fileName: string,
  questionId: number,
  promptId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Download image from Imagen URL
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const imageBlob = await response.blob()
    
    // Create storage path: questions/{questionId}/images/{promptId}_{timestamp}.png
    const timestamp = Date.now()
    const extension = imageBlob.type === 'image/jpeg' ? 'jpg' : 'png'
    const filePath = `questions/${questionId}/images/${promptId}_${timestamp}.${extension}`

    // Upload to Supabase Storage
    return await uploadImage(imageBlob, filePath, {
      contentType: imageBlob.type,
      cacheControl: '604800' // 1 week cache for generated images
    })

  } catch (err) {
    console.error('Unexpected error uploading image from URL:', err)
    return { 
      success: false, 
      error: getStorageErrorMessage(err) 
    }
  }
}

/**
 * Delete image from storage
 */
export const deleteImage = async (
  filePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return { success: false, error: getStorageErrorMessage(error) }
    }

    console.log(`✅ Successfully deleted image: ${filePath}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error deleting image:', err)
    return { 
      success: false, 
      error: getStorageErrorMessage(err) 
    }
  }
}

/**
 * Get public URL for an image
 */
export const getImageUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

/**
 * Extract file path from Supabase Storage URL
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Supabase storage URLs have format: /storage/v1/object/public/bucket/path
    const bucketIndex = pathParts.indexOf(IMAGES_BUCKET)
    if (bucketIndex === -1) return null
    
    return pathParts.slice(bucketIndex + 1).join('/')
  } catch {
    return null
  }
}

/**
 * Generate unique file name for image
 */
export const generateImageFileName = (
  questionId: number,
  promptId: string,
  attemptNumber: number,
  extension: 'png' | 'jpg' = 'png'
): string => {
  const timestamp = Date.now()
  return `questions/${questionId}/images/${promptId}_attempt${attemptNumber}_${timestamp}.${extension}`
}

/**
 * Get image file size from blob
 */
export const getImageSize = async (
  imageUrl: string
): Promise<{ width?: number; height?: number; size?: number; error?: string }> => {
  try {
    // Create image element to get dimensions
    return new Promise((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      
      img.onerror = () => {
        resolve({ error: 'Failed to load image for size calculation' })
      }
      
      img.src = imageUrl
    })

  } catch (err) {
    return { error: getStorageErrorMessage(err) }
  }
}

/**
 * Cleanup old images for a question (keep only latest N attempts per prompt)
 */
export const cleanupOldImages = async (
  questionId: number,
  keepLatestAttempts: number = 3
): Promise<{ success: boolean; deletedCount?: number; error?: string }> => {
  try {
    // This would require database integration to find old images
    // For now, just return success - implement when needed
    console.log(`🧹 Cleanup requested for question ${questionId}, keeping latest ${keepLatestAttempts} attempts`)
    
    return { 
      success: true, 
      deletedCount: 0 
    }

  } catch (err) {
    console.error('Unexpected error during cleanup:', err)
    return { 
      success: false, 
      error: getStorageErrorMessage(err) 
    }
  }
}

/* ========== EXPORTS ========== */

const imageStorageApi = {
  uploadImage,
  uploadImageFromUrl,
  deleteImage,
  getImageUrl,
  extractFilePathFromUrl,
  generateImageFileName,
  getImageSize,
  cleanupOldImages
}

export default imageStorageApi