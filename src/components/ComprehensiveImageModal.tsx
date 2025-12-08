'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Image as ImageIcon, CheckCircle, Clock, RefreshCw, Edit3, Check, Trash2, Plus } from 'lucide-react'
import type { GeneratedImage, QuestionImage } from '@/types/question'
import type { Question as ParsedQuestion } from '@/lib/questionParser'
import Portal from './Portal'
import { useAuth } from '@/contexts/AuthContext'
import imagenClientService from '@/lib/imagenClient'

interface ComprehensiveImageModalProps {
  isOpen: boolean
  onClose: () => void
  question: ParsedQuestion
  images: GeneratedImage[]
  onImageSelect: (imageId: string, placeholder: string, isSelected: boolean) => void
  onRefreshImages?: () => void
  onImagesGenerated?: (images: GeneratedImage[]) => void
  
  // New schema props
  questionId?: number
  useNewSchema?: boolean
}

interface GenerationStatus {
  placeholder: string
  status: 'pending' | 'generating' | 'success' | 'error'
  imageUrl?: string
  error?: string
  progress?: number
}

export default function ComprehensiveImageModal({
  isOpen,
  onClose,
  question,
  images,
  onImageSelect,
  onRefreshImages,
  onImagesGenerated,
  questionId,
  useNewSchema = false
}: ComprehensiveImageModalProps) {
  const { user } = useAuth()
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'gallery' | 'generate'>('gallery')
  
  // Gallery state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Generation state
  const [generationStatuses, setGenerationStatuses] = useState<GenerationStatus[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [, setCurrentlyGenerating] = useState<string | null>(null)
  const [editingPrompts, setEditingPrompts] = useState<{ [key: string]: string }>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState<{ [key: string]: boolean }>({})  
  
  // Prompt ID tracking and saved state
  const [promptIds, setPromptIds] = useState<{ [key: string]: string }>({})
  const [promptsSaved, setPromptsSaved] = useState<{ [key: string]: boolean }>({})
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null)
  
  // Soft delete state
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)  // New schema state
  const [newSchemaImages, setNewSchemaImages] = useState<QuestionImage[]>([])
  const [, setLoadingImages] = useState(false)

  // Use question.imagePrompts as single source of truth
  const imagePrompts = question.imagePrompts || []
  
  // Fetch ALL images for the question (not just selected ones)
  useEffect(() => {
    const fetchAllQuestionImages = async () => {
      if (!isOpen || !questionId || !useNewSchema || !user?.accessToken) return

      setLoadingImages(true)
      try {
        // Use the correct endpoint that returns ALL images for the question
        const response = await fetch(`/api/questions/${questionId}/images`, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setNewSchemaImages(result.data)
          } else {
            setNewSchemaImages([])
          }
        } else {
          console.error('Failed to fetch images:', response.status)
          setNewSchemaImages([])
        }
      } catch (error) {
        console.error('Error fetching question images:', error)
        setNewSchemaImages([])
      } finally {
        setLoadingImages(false)
      }
    }

    fetchAllQuestionImages()
  }, [isOpen, questionId, useNewSchema, user?.accessToken])
  
  // Determine which images to use and how to group them
  const imagesToUse = useNewSchema ? newSchemaImages : images
  
  // Group images by placement type for new schema or by placeholder for legacy
  const imagesByPlacement = useNewSchema
    ? newSchemaImages.reduce((acc, image) => {
        const key = image.placement_type || 'question'
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(image)
        return acc
      }, {} as Record<string, QuestionImage[]>)
    : images.reduce((acc, image) => {
        // Use placement for legacy images, fallback to 'question'
        const key = image.placement || 'question'
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(image)
        return acc
      }, {} as Record<string, GeneratedImage[]>)
  
  // Sort by placement type for better organization
  const sortedPlacements = Object.entries(imagesByPlacement).sort(([aPlacement], [bPlacement]) => {
    // Define order: question, options (a,b,c,d), explanation
    const placementOrder = {
      'question': 0,
      'before_question': 1,
      'option_a': 2,
      'option_b': 3,
      'option_c': 4,
      'option_d': 5,
      'explanation': 6
    }
    
    const aOrder = placementOrder[aPlacement as keyof typeof placementOrder] ?? 999
    const bOrder = placementOrder[bPlacement as keyof typeof placementOrder] ?? 999
    
    return aOrder - bOrder
  })

  // Removed verbose image state debugging

  // Initialize generation statuses from question image prompts
  useEffect(() => {
    if (isOpen && question.imagePrompts) {
      const statuses: GenerationStatus[] = question.imagePrompts.map((prompt: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }) => ({
        placeholder: prompt.placeholder,
        status: 'pending' as const,
        progress: 0
      }))
      
      setGenerationStatuses(statuses)
      
      // Initialize editing prompts, prompt IDs, and saved status
      const prompts: { [key: string]: string } = {}
      const ids: { [key: string]: string } = {}
      const saved: { [key: string]: boolean } = {}
      
      question.imagePrompts.forEach((prompt: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }) => {
        prompts[prompt.placeholder] = prompt.prompt
        // If prompt has database ID, mark as saved
        if (prompt.id) {
          ids[prompt.placeholder] = prompt.id
          saved[prompt.placeholder] = true
        } else {
          saved[prompt.placeholder] = false
        }
      })
      
      setEditingPrompts(prompts)
      setPromptIds(ids)
      setPromptsSaved(saved)
    }
  }, [isOpen, question.imagePrompts])

  // Auto-switch to gallery tab if there are images
  useEffect(() => {
    if (isOpen && images.length > 0) {
      setActiveTab('gallery')
    } else if (isOpen && images.length === 0) {
      setActiveTab('generate')
    }
  }, [isOpen, images.length])

  // Handle image selection
  const handleImageSelect = async (image: GeneratedImage | QuestionImage) => {
    if (!user?.accessToken) return
    
    setIsSelecting(true)
    setSelectedImageId(image.id)
    
    try {
      let requestBody: { image_id: string; question_id?: number; placement_type?: string; prompt_id?: string }

      if (useNewSchema && questionId && 'placement_type' in image) {
        // New schema approach
        requestBody = {
          image_id: image.id,
          question_id: questionId,
          placement_type: image.placement_type
        }
      } else if (image.prompt_id) {
        // Legacy approach
        requestBody = {
          image_id: image.id,
          prompt_id: image.prompt_id
        }
      } else {
        throw new Error('Insufficient data for image selection')
      }

      // Call the image selection API
      const response = await fetch('/api/images/select', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to select image')
      }
      
      // Refresh modal images immediately to show new selection
      if (useNewSchema && questionId && user?.accessToken) {
        try {
          const response = await fetch(`/api/questions/${questionId}/images`, {
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              setNewSchemaImages(result.data)
            }
          }
        } catch (error) {
          console.error('Error refreshing modal images:', error)
        }
      }
      
      // Call the original callback for parent updates
      await onImageSelect(image.id, image.prompt_text || '', true)
      
      // Note: Not calling onRefreshImages() here to avoid duplicate API calls
      // Parent will handle background updates via onImageSelect callback
    } catch (error) {
      console.error('Failed to select image:', error)
    } finally {
      setIsSelecting(false)
      setSelectedImageId(null)
    }
  }

  // Handle soft delete (mark as deleted)
  const handleSoftDelete = async (imageId: string) => {
    if (!user?.accessToken) return
    
    setDeletingImageId(imageId)
    
    try {
      // Call API to soft delete the image
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete image')
      }
      
      onRefreshImages?.()
    } catch (error) {
      console.error('Failed to delete image:', error)
    } finally {
      setDeletingImageId(null)
    }
  }

  // Handle image generation with proper persistence (CLIENT-SIDE)
  const handleGenerateImages = async () => {
    if (!user?.accessToken || !question.imagePrompts || !questionId) return
    
    // Check if all prompts are saved
    const allPromptsSaved = question.imagePrompts.every((prompt: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }) => 
      promptsSaved[prompt.placeholder]
    )
    
    if (!allPromptsSaved) {
      console.warn('⚠️ Cannot generate - not all prompts are saved')
      return
    }
    
    setIsGenerating(true)
    const generatedImages: GeneratedImage[] = []
    let successCount = 0
    
    try {
      for (const prompt of question.imagePrompts) {
        setCurrentlyGenerating(prompt.placeholder)
        
        // Update status to generating
        setGenerationStatuses(prev => 
          prev.map(status => 
            status.placeholder === prompt.placeholder 
              ? { ...status, status: 'generating', progress: 0, error: undefined }
              : status
          )
        )
        
        try {
          // Use the current prompt text and saved prompt ID
          const promptToUse = editingPrompts[prompt.placeholder] || prompt.prompt
          const promptId = promptIds[prompt.placeholder]
          
          if (!promptId) {
            throw new Error('No prompt ID available - prompt must be saved first')
          }
          
          // Generate and save image using client-side workflow
          const result = await imagenClientService.generateAndSaveImage(
            promptToUse,
            questionId,
            promptId, // Use real prompt ID
            user.accessToken
          )
          
          if (result.success && result.imageUrl) {
            // If we don't have a prompt ID, we need to save to new schema
            if (!(prompt as { id?: string; placement?: string }).id && useNewSchema) {
              await saveImageWithNewSchema(
                questionId,
                (prompt as { id?: string; placement?: string }).placement || 'question',
                result.imageUrl,
                promptToUse
              )
            }
            
            // Convert to GeneratedImage format for compatibility
            const newImage: GeneratedImage = {
              id: (result.imageRecord?.id as string) || `temp_${Date.now()}_${Math.random()}`,
              prompt_id: (prompt as { id?: string }).id || 'new_schema',
              image_url: result.imageUrl,
              prompt_used: promptToUse,
              attempt_number: (result.imageRecord?.attempt_number as number) || 1,
              prompt_text: prompt.placeholder,
              alt_text: prompt.prompt,
              generated_at: new Date().toISOString(),
              is_selected: true,
              user_rating: undefined,
              accuracy_feedback: undefined
            }
            
            generatedImages.push(newImage)
            successCount++
            
            // Update status to success
            setGenerationStatuses(prev => 
              prev.map(status => 
                status.placeholder === prompt.placeholder 
                  ? { ...status, status: 'success', imageUrl: result.imageUrl, progress: 100 }
                  : status
              )
            )
          } else {
            throw new Error(result.error || 'Generation failed')
          }
        } catch (error) {
          console.error(`Failed to generate image for ${prompt.placeholder}:`, error)
          
          // Provide specific error messages for common issues
          let errorMessage = 'Generation failed'
          if (error instanceof Error) {
            if (error.message.includes('403') || error.message.includes('quota')) {
              errorMessage = 'API quota exceeded. Please try again later.'
            } else if (error.message.includes('content policy')) {
              errorMessage = 'Content policy violation. Try rephrasing the prompt.'
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = 'Network error. Check your connection and try again.'
            } else {
              errorMessage = error.message
            }
          }
          
          // Update status to error with specific message
          setGenerationStatuses(prev => 
            prev.map(status => 
              status.placeholder === prompt.placeholder 
                ? { ...status, status: 'error', error: errorMessage }
                : status
            )
          )
        }
      }
      
      // If any images were generated successfully, refresh the gallery
      if (successCount > 0) {
        console.log(`✅ Generated ${successCount} images, refreshing gallery...`)
        
        // Refresh gallery by fetching updated images
        await refreshGalleryImages()
        
        // Notify parent of generated images
        onImagesGenerated?.(generatedImages)
        onRefreshImages?.()
        
        // Switch to gallery tab to show results
        setActiveTab('gallery')
      }
    } finally {
      setIsGenerating(false)
      setCurrentlyGenerating(null)
    }
  }
  
  // Helper function to save image with new schema
  const saveImageWithNewSchema = async (
    questionId: number,
    placementType: string,
    imageUrl: string,
    promptUsed: string
  ) => {
    try {
      const response = await fetch('/api/images/save-new-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`
        },
        body: JSON.stringify({
          question_id: questionId,
          placement_type: placementType,
          image_url: imageUrl,
          prompt_used: promptUsed
        })
      })
      
      if (!response.ok) {
        console.warn('Failed to save with new schema:', response.status)
      }
    } catch (error) {
      console.warn('Error saving with new schema:', error)
    }
  }
  
  // Helper function to refresh gallery images
  const refreshGalleryImages = async () => {
    if (!questionId || !useNewSchema || !user?.accessToken) return
    
    try {
      console.log('🔄 Refreshing gallery images...')
      const response = await fetch(`/api/questions/${questionId}/images`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setNewSchemaImages(result.data)
          console.log('✅ Gallery refreshed with', result.data.length, 'images')
        }
      } else {
        console.error('Failed to refresh gallery:', response.status)
      }
    } catch (error) {
      console.error('Error refreshing gallery images:', error)
    }
  }

  // Handle prompt editing
  const handlePromptEdit = (placeholder: string, newPrompt: string) => {
    setEditingPrompts(prev => ({
      ...prev,
      [placeholder]: newPrompt
    }))
  }

  const togglePromptEdit = async (placeholder: string) => {
    const isCurrentlyEditing = isEditingPrompt[placeholder]
    
    if (isCurrentlyEditing) {
      // User clicked tick - save the prompt immediately
      const promptText = editingPrompts[placeholder]
      if (promptText && questionId) {
        setSavingPrompt(placeholder)
        try {
          const response = await fetch('/api/images/prompts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user?.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              question_id: questionId,
              prompt_text: promptText,
              placement: 'question',
              style_preference: 'educational_diagram'
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              // Update prompt ID and mark as saved
              setPromptIds(prev => ({
                ...prev,
                [placeholder]: result.data.id
              }))
              setPromptsSaved(prev => ({
                ...prev,
                [placeholder]: true
              }))
              console.log('✅ Prompt saved with ID:', result.data.id)
            }
          } else {
            console.error('❌ Failed to save prompt:', response.status)
            // TODO: Show error to user
          }
        } catch (error) {
          console.error('❌ Error saving prompt:', error)
          // TODO: Show error to user
        } finally {
          setSavingPrompt(null)
        }
      }
    }
    
    // Toggle editing state
    setIsEditingPrompt(prev => ({
      ...prev,
      [placeholder]: !prev[placeholder]
    }))
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Manage Images
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Generate, view, and manage educational images for this question
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'gallery'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Gallery ({imagesToUse.length})
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'generate'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Generate ({imagePrompts.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                {imagesToUse.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No images yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Generate some educational images to get started
                    </p>
                    <button
                      onClick={() => setActiveTab('generate')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Generate Images
                    </button>
                  </div>
                ) : (
                  sortedPlacements.map(([placementKey, placementImages]) => {
                    // For new schema, placementKey is placement_type; for legacy, it's prompt_text
                    const placement = useNewSchema ? placementKey : (placementImages[0] as GeneratedImage)?.placement || 'question'
                    
                    // Create a more descriptive title
                    const getPlacementTitle = (placement: string, placementKey: string) => {
                      if (useNewSchema) {
                        // For new schema, placementKey is the placement_type
                        switch (placement) {
                          case 'question':
                            return `Question Images`
                          case 'explanation':
                            return `Explanation Images`
                          case 'option_a':
                            return `Option A Images`
                          case 'option_b':
                            return `Option B Images`
                          case 'option_c':
                            return `Option C Images`
                          case 'option_d':
                            return `Option D Images`
                          default:
                            return `${placement} Images`
                        }
                      } else {
                        // Legacy schema - use prompt text
                        switch (placement) {
                          case 'question':
                            return `Question: ${placementKey}`
                          case 'explanation':
                            return `Explanation: ${placementKey}`
                          case 'option_a':
                            return `Option A: ${placementKey}`
                          case 'option_b':
                            return `Option B: ${placementKey}`
                          case 'option_c':
                            return `Option C: ${placementKey}`
                          case 'option_d':
                            return `Option D: ${placementKey}`
                          default:
                            return placementKey
                        }
                      }
                    }
                    
                    return (
                    <div key={placementKey} className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {getPlacementTitle(placement, placementKey)}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                          {placementImages.length} image{placementImages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {placementImages.map((image: GeneratedImage | QuestionImage) => (
                          <div
                            key={image.id}
                            className={`relative group bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden ${
                              image.is_selected 
                                ? 'ring-2 ring-green-500 border-2 border-green-500' 
                                : 'border-2 border-transparent hover:border-blue-300'
                            }`}
                          >
                            <Image
                              src={image.image_url}
                              alt={image.alt_text || ''}
                              className="w-full h-32 object-cover"
                              width={300}
                              height={128}
                              unoptimized
                            />
                            
                            {/* Selected indicator */}
                            {image.is_selected && (
                              <div className="absolute top-2 left-2 bg-green-500 text-white p-1 rounded-full">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleImageSelect(image)}
                                  disabled={isSelecting && selectedImageId === image.id || image.is_selected}
                                  className={`px-3 py-1 text-white text-sm rounded transition-colors disabled:opacity-50 ${
                                    image.is_selected 
                                      ? 'bg-green-600 hover:bg-green-700' 
                                      : 'bg-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {isSelecting && selectedImageId === image.id ? (
                                    <>
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      Selecting...
                                    </>
                                  ) : image.is_selected ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 inline mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    'Select'
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(image.id)}
                                  disabled={deletingImageId === image.id}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                  {deletingImageId === image.id ? (
                                    <Clock className="w-4 h-4" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Generation info */}
                            <div className="p-2 bg-white dark:bg-gray-800">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {new Date(image.generated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === 'generate' && (
              <div className="space-y-6">
                {imagePrompts.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No image prompts found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      This question doesn&apos;t have any image prompts to generate.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Ready to generate {imagePrompts.length} image{imagePrompts.length !== 1 ? 's' : ''}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-200">
                        Review and edit the prompts below, then generate all images at once.
                      </p>
                    </div>

                    {/* Generation prompts - organized by placement */}
                    <div className="space-y-6">
                      {question.imagePrompts?.sort((a: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }, b: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }) => {
                        // Same placement order as gallery
                        const placementOrder = {
                          'question': 0,
                          'before_question': 1,
                          'option_a': 2,
                          'option_b': 3,
                          'option_c': 4,
                          'option_d': 5,
                          'explanation': 6
                        }
                        
                        const aOrder = placementOrder[a.placement as keyof typeof placementOrder] ?? 999
                        const bOrder = placementOrder[b.placement as keyof typeof placementOrder] ?? 999
                        
                        return aOrder - bOrder
                      }).map((prompt: { placeholder: string; prompt: string; purpose: string; accuracy?: string; style?: string; id?: string; placement?: string }) => {
                        const status = generationStatuses.find(s => s.placeholder === prompt.placeholder)
                        const isEditing = isEditingPrompt[prompt.placeholder]
                        
                        return (
                          <div key={prompt.placeholder} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    {prompt.placeholder}
                                  </h4>
                                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                    {prompt.placement === 'question' ? 'Question' :
                                     prompt.placement === 'explanation' ? 'Explanation' :
                                     prompt.placement?.startsWith('option_') ? `Option ${prompt.placement.slice(-1).toUpperCase()}` :
                                     'Other'}
                                  </span>
                                  {promptsSaved[prompt.placeholder] ? (
                                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                                      Saved
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded-full">
                                      Unsaved
                                    </span>
                                  )}
                                </div>
                                {status && (
                                  <div className="flex items-center mt-1 space-x-2">
                                    {status.status === 'generating' && (
                                      <>
                                        <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                                        <span className="text-sm text-blue-600 dark:text-blue-400">Generating...</span>
                                      </>
                                    )}
                                    {status.status === 'success' && (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-green-600 dark:text-green-400">Generated successfully</span>
                                      </>
                                    )}
                                    {status.status === 'error' && (
                                      <>
                                        <X className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-600 dark:text-red-400">{status.error}</span>
                                        <button
                                          onClick={() => {
                                            // Reset error status to allow retry
                                            setGenerationStatuses(prev => 
                                              prev.map(s => 
                                                s.placeholder === status.placeholder 
                                                  ? { ...s, status: 'pending', error: undefined }
                                                  : s
                                              )
                                            )
                                          }}
                                          className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                                        >
                                          Retry
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => togglePromptEdit(prompt.placeholder)}
                                disabled={savingPrompt === prompt.placeholder}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                              >
                                {savingPrompt === prompt.placeholder ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : isEditing ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Edit3 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            
                            {isEditing ? (
                              <textarea
                                value={editingPrompts[prompt.placeholder] || prompt.prompt}
                                onChange={(e) => handlePromptEdit(prompt.placeholder, e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
                                rows={3}
                                placeholder="Edit the image prompt..."
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                {editingPrompts[prompt.placeholder] || prompt.prompt}
                              </p>
                            )}
                            
                            {status?.imageUrl && (
                              <div className="mt-3">
                                <Image
                                  src={status.imageUrl}
                                  alt={prompt.placeholder}
                                  className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                  width={128}
                                  height={128}
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-4">
              {activeTab === 'gallery' && images.length > 0 && (
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Generate More
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              {activeTab === 'generate' && imagePrompts.length > 0 && (
                <button
                  onClick={handleGenerateImages}
                  disabled={isGenerating || !question.imagePrompts?.every((prompt: { placeholder: string }) => promptsSaved[prompt.placeholder])}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Generate All Images</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}