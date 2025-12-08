'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ImageIcon, RefreshCw, CheckCircle, AlertCircle, Edit3, Check, Clock } from 'lucide-react'
import type { GeneratedImage } from '@/types/question'
import type { Question as ParsedQuestion } from '@/lib/questionParser'
import imagenClientService from '@/lib/imagenClient'
import Portal from './Portal'
import { useAuth } from '@/contexts/AuthContext'

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  question: ParsedQuestion
  onImagesGenerated: (images: GeneratedImage[]) => void
}

interface GenerationStatus {
  placeholder: string
  status: 'pending' | 'generating' | 'success' | 'error' | 'retry'
  imageUrl?: string
  error?: string
  progress?: number
}

export default function ImageGenerationModal({
  isOpen,
  onClose,
  question,
  onImagesGenerated
}: ImageGenerationModalProps) {
  const { user } = useAuth()
  const [generationStatuses, setGenerationStatuses] = useState<GenerationStatus[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string | null>(null)
  const [editingPrompts, setEditingPrompts] = useState<{ [key: string]: string }>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState<{ [key: string]: boolean }>({})
  const [acceptedImages, setAcceptedImages] = useState<{ [key: string]: boolean }>({})

  // Initialize generation statuses from question image prompts
  useEffect(() => {
    if (isOpen && question.imagePrompts) {
      const statuses: GenerationStatus[] = question.imagePrompts.map((prompt) => ({
        placeholder: prompt.placeholder,
        status: 'pending' as const,
        progress: 0
      }))
      
      setGenerationStatuses(statuses)
    }
  }, [isOpen, question.imagePrompts])

  // Initialize editing prompts when modal opens
  useEffect(() => {
    if (isOpen && question.imagePrompts) {
      const initialPrompts: { [key: string]: string } = {}
      question.imagePrompts.forEach((prompt) => {
        initialPrompts[prompt.placeholder] = prompt.prompt
      })
      setEditingPrompts(initialPrompts)
    }
  }, [isOpen, question.imagePrompts])

  const handleEditPrompt = (placeholder: string) => {
    setIsEditingPrompt(prev => ({ ...prev, [placeholder]: true }))
  }

  const handleSavePrompt = (placeholder: string) => {
    setIsEditingPrompt(prev => ({ ...prev, [placeholder]: false }))
    // The edited prompt is already in editingPrompts state
  }

  const handleCancelEdit = (placeholder: string) => {
    // Reset to original prompt
    const originalPrompt = question.imagePrompts?.find((p) => p.placeholder === placeholder)?.prompt
    if (originalPrompt) {
      setEditingPrompts(prev => ({ ...prev, [placeholder]: originalPrompt }))
    }
    setIsEditingPrompt(prev => ({ ...prev, [placeholder]: false }))
  }

  const handleAcceptImage = (placeholder: string) => {
    setAcceptedImages(prev => ({ ...prev, [placeholder]: true }))
    
    // Get the generated image for this placeholder
    const status = generationStatuses.find(s => s.placeholder === placeholder)
    if (status && status.imageUrl) {
      // Create a GeneratedImage object
      const acceptedImage: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt_id: crypto.randomUUID(),
        image_url: status.imageUrl,
        prompt_used: editingPrompts[placeholder] || '',
        attempt_number: 1,
        is_selected: true,
        generated_at: new Date().toISOString()
      }
      
      // Pass to parent
      onImagesGenerated([acceptedImage])
    }
  }

  const generateSingleImage = async (placeholder: string) => {
    const prompt = question.imagePrompts?.find((p) => p.placeholder === placeholder)
    if (!prompt) return

    setCurrentlyGenerating(placeholder)
    setIsGenerating(true)

    // Update status to generating
    setGenerationStatuses(prev => prev.map(status => 
      status.placeholder === placeholder
        ? { ...status, status: 'generating', progress: 0, error: undefined, imageUrl: undefined }
        : status
    ))

    const progressInterval = setInterval(() => {
      setGenerationStatuses(prev => prev.map(status => 
        status.placeholder === placeholder && status.status === 'generating'
          ? { ...status, progress: Math.min((status.progress || 0) + 10, 90) }
          : status
      ))
    }, 500)

    try {
      // Check authentication
      if (!user?.accessToken) {
        throw new Error('Authentication required. Please log in.')
      }

      // Create prompt record
      const promptResponse = await fetch('/api/images/prompts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          question_id: question.id || null,
          prompt_text: editingPrompts[placeholder] || prompt.prompt,
          original_ai_prompt: prompt.prompt,
          placement: 'question',
          style_preference: prompt.style || 'educational_diagram'
        })
      })
      
      if (!promptResponse.ok) {
        throw new Error('Failed to save prompt to database')
      }
      
      const promptData = await promptResponse.json()
      
      // CLIENT-SIDE IMAGE GENERATION (New Approach)
      console.log('🎨 Starting CLIENT-SIDE image generation for:', placeholder)
      
      const finalPrompt = editingPrompts[placeholder] || prompt.prompt
      const enhancedPrompt = `${finalPrompt}. Educational illustration, textbook style, ${prompt.style || 'educational_diagram'}, accurate and clear for students`
      
      const result = await imagenClientService.generateAndSaveImage(
        enhancedPrompt,
        question.id || 'temp',
        promptData.data.id,
        user.accessToken || '',
        {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: 'dont_allow'
        }
      )
      
      clearInterval(progressInterval)

      if (result.success && result.imageUrl) {
        setGenerationStatuses(prev => prev.map(status => 
          status.placeholder === placeholder
            ? { 
                ...status, 
                status: 'success', 
                imageUrl: result.imageUrl,
                progress: 100 
              }
            : status
        ))
      } else {
        setGenerationStatuses(prev => prev.map(status => 
          status.placeholder === placeholder
            ? { 
                ...status, 
                status: 'error',
                error: result.error || 'Generation failed',
                progress: 0 
              }
            : status
        ))
      }

    } catch (error) {
      clearInterval(progressInterval)
      setGenerationStatuses(prev => prev.map(status => 
        status.placeholder === placeholder
          ? { 
              ...status, 
              status: 'error',
              error: error instanceof Error ? error.message : 'Generation failed',
              progress: 0 
            }
          : status
      ))
    } finally {
      setIsGenerating(false)
      setCurrentlyGenerating(null)
    }
  }

  const generateAllImages = async () => {
    if (!question.imagePrompts || question.imagePrompts.length === 0) return
    
    setIsGenerating(true)
    const generatedImages: GeneratedImage[] = []

    try {
      for (let i = 0; i < question.imagePrompts.length; i++) {
        const prompt = question.imagePrompts[i]
        
        // Update status to generating
        setCurrentlyGenerating(prompt.placeholder)
        setGenerationStatuses(prev => prev.map(status => 
          status.placeholder === prompt.placeholder
            ? { ...status, status: 'generating', progress: 0 }
            : status
        ))

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setGenerationStatuses(prev => prev.map(status => 
            status.placeholder === prompt.placeholder && status.status === 'generating'
              ? { ...status, progress: Math.min((status.progress || 0) + 10, 90) }
              : status
          ))
        }, 500)

        try {
          // First, create prompt record in database
          const promptResponse = await fetch('/api/images/prompts', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.accessToken}`
            },
            body: JSON.stringify({
              question_id: question.id || null,
              prompt_text: editingPrompts[prompt.placeholder] || prompt.prompt,
              original_ai_prompt: prompt.prompt,
              placement: 'question', // Default to question placement
              style_preference: prompt.style || 'educational_diagram'
            })
          })
          
          if (!promptResponse.ok) {
            throw new Error('Failed to save prompt to database')
          }
          
          const promptData = await promptResponse.json()
          const promptId = promptData.data.id
          
          // CLIENT-SIDE IMAGE GENERATION (New Approach)
          console.log('🎨 Starting CLIENT-SIDE batch generation for:', prompt.placeholder)
          
          const finalPrompt = editingPrompts[prompt.placeholder] || prompt.prompt
          const enhancedPrompt = `${finalPrompt}. Educational illustration, textbook style, ${prompt.style || 'educational_diagram'}, accurate and clear for students`
          
          const result = await imagenClientService.generateAndSaveImage(
            enhancedPrompt,
            question.id || 'temp',
            promptId,
            user?.accessToken || '',
            {
              numberOfImages: 1,
              aspectRatio: '1:1',
              personGeneration: 'dont_allow'
            }
          )

          clearInterval(progressInterval)

          if (result.success && result.imageUrl) {
            // Update status to success
            setGenerationStatuses(prev => prev.map(status => 
              status.placeholder === prompt.placeholder
                ? { 
                    ...status, 
                    status: 'success', 
                    imageUrl: result.imageUrl,
                    progress: 100 
                  }
                : status
            ))

            // Add to generated images array using imageRecord data
            generatedImages.push({
              id: (result.imageRecord?.id as string) || `temp-${Date.now()}`,
              prompt_id: promptId,
              image_url: result.imageUrl,
              prompt_used: enhancedPrompt,
              attempt_number: (result.imageRecord?.attempt_number as number) || 1,
              is_selected: true,
              generated_at: (result.imageRecord?.generated_at as string) || new Date().toISOString()
            })

          } else {
            // Update status to error
            setGenerationStatuses(prev => prev.map(status => 
              status.placeholder === prompt.placeholder
                ? { 
                    ...status, 
                    status: 'error', 
                    error: result.error || 'Unknown error',
                    progress: 0 
                  }
                : status
            ))
          }

        } catch (error) {
          clearInterval(progressInterval)
          
          setGenerationStatuses(prev => prev.map(status => 
            status.placeholder === prompt.placeholder
              ? { 
                  ...status, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : 'Generation failed',
                  progress: 0 
                }
              : status
          ))
        }

        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Pass generated images back to parent
      if (generatedImages.length > 0) {
        onImagesGenerated(generatedImages)
      }

    } finally {
      setIsGenerating(false)
      setCurrentlyGenerating(null)
    }
  }

  const retryGeneration = async (placeholder: string) => {
    const prompt = question.imagePrompts?.find((p) => p.placeholder === placeholder)
    if (!prompt) return

    // Update status to generating
    setGenerationStatuses(prev => prev.map(status => 
      status.placeholder === placeholder
        ? { ...status, status: 'generating', progress: 0, error: undefined }
        : status
    ))

    try {
      // Get the previous error for context
      const previousStatus = generationStatuses.find(s => s.placeholder === placeholder)
      const previousError = previousStatus?.error || 'Generation failed'

      // Create new prompt record for retry
      const promptResponse = await fetch('/api/images/prompts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`
        },
        body: JSON.stringify({
          question_id: question.id || null,
          prompt_text: prompt.prompt,
          original_ai_prompt: prompt.prompt,
          placement: 'question', // Default to question placement
          style_preference: prompt.style || 'educational_diagram'
        })
      })
      
      if (!promptResponse.ok) {
        throw new Error('Failed to save retry prompt')
      }
      
      const promptData = await promptResponse.json()
      
      // CLIENT-SIDE RETRY GENERATION (New Approach)
      console.log('🔄 Starting CLIENT-SIDE retry generation for:', placeholder)
      
      const result = await imagenClientService.retryImageGeneration(
        prompt.prompt,
        previousError,
        question.id || 'temp',
        promptData.data.id,
        user?.accessToken || '',
        {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: 'dont_allow'
        }
      )

      if (result.success && result.imageUrl) {
        setGenerationStatuses(prev => prev.map(status => 
          status.placeholder === placeholder
            ? { 
                ...status, 
                status: 'success', 
                imageUrl: result.imageUrl,
                progress: 100,
                error: undefined
              }
            : status
        ))

        // Add to generated images
        const newImage: GeneratedImage = {
          id: (result.imageRecord?.id as string) || `retry-${Date.now()}`,
          prompt_id: promptData.data.id,
          image_url: result.imageUrl,
          prompt_used: 'Improved educational illustration: ' + prompt.prompt,
          attempt_number: (result.imageRecord?.attempt_number as number) || 1,
          is_selected: true,
          generated_at: (result.imageRecord?.generated_at as string) || new Date().toISOString()
        }

        onImagesGenerated([newImage])

      } else {
        setGenerationStatuses(prev => prev.map(status => 
          status.placeholder === placeholder
            ? { 
                ...status, 
                status: 'error', 
                error: result.error || 'Retry failed',
                progress: 0 
              }
            : status
        ))
      }

    } catch (error) {
      setGenerationStatuses(prev => prev.map(status => 
        status.placeholder === placeholder
          ? { 
              ...status, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Retry failed',
              progress: 0 
            }
          : status
      ))
    }
  }

  const getStatusIcon = (status: GenerationStatus) => {
    switch (status.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />
      case 'generating':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
      case 'retry':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <ImageIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600'
      case 'generating': return 'bg-blue-100 text-blue-700'
      case 'success': return 'bg-green-100 text-green-700'
      case 'error': return 'bg-red-100 text-red-700'
      case 'retry': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-blue-600" />
                Generate Educational Images
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {question.imagePrompts?.length || 0} images to generate
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isGenerating}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Question Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Question:</h3>
              <p className="text-gray-700 leading-relaxed">{question.question}</p>
            </div>

            {/* Image Generation List */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Image Generation Progress:</h3>
              
              {generationStatuses.map((status) => {
                const prompt = question.imagePrompts?.find((p) => p.placeholder === status.placeholder)
                
                return (
                  <div key={status.placeholder} className="border rounded-lg p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {status.placeholder}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {prompt?.prompt || 'Educational illustration'}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                        {status.status === 'generating' ? 'Generating...' : 
                         status.status === 'success' ? 'Complete' :
                         status.status === 'error' ? 'Failed' : 'Pending'}
                      </span>
                    </div>

                    {/* Prompt Editing Section */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Image Prompt:</label>
                        {!isEditingPrompt[status.placeholder] ? (
                          <button
                            onClick={() => handleEditPrompt(status.placeholder)}
                            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSavePrompt(status.placeholder)}
                              className="px-2 py-1 text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => handleCancelEdit(status.placeholder)}
                              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditingPrompt[status.placeholder] ? (
                        <textarea
                          value={editingPrompts[status.placeholder] || ''}
                          onChange={(e) => setEditingPrompts(prev => ({ ...prev, [status.placeholder]: e.target.value }))}
                          className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Enter your image prompt..."
                        />
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {editingPrompts[status.placeholder] || prompt?.prompt || 'No prompt available'}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {status.status === 'generating' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${status.progress || 0}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {status.error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-700">{status.error}</p>
                      </div>
                    )}

                    {/* Generated Image Preview with Actions */}
                    {status.imageUrl && (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <Image 
                            src={status.imageUrl} 
                            alt={prompt?.prompt || 'Generated image'}
                            className="w-full max-w-sm mx-auto rounded-lg shadow-sm"
                            width={400}
                            height={400}
                            unoptimized
                          />
                        </div>
                        
                        {/* Image Action Buttons */}
                        {!acceptedImages[status.placeholder] ? (
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => handleAcceptImage(status.placeholder)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Accept Image
                            </button>
                            <button
                              onClick={() => retryGeneration(status.placeholder)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Regenerate
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <Check className="w-4 h-4 mr-2" />
                              Image Accepted
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Button for Pending Status */}
                    {status.status === 'pending' && (
                      <div className="text-center">
                        <button
                          onClick={() => generateSingleImage(status.placeholder)}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 mx-auto"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Generate Image
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {currentlyGenerating && (
                  <span>Currently generating: {currentlyGenerating}</span>
                )}
                {Object.keys(acceptedImages).length > 0 && (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {Object.keys(acceptedImages).length} image(s) accepted
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isGenerating}
                >
                  {Object.keys(acceptedImages).length > 0 ? 'Done' : 'Cancel'}
                </button>
                
                {/* Generate All Remaining Images */}
                {generationStatuses.some(s => s.status === 'pending' || s.status === 'error') && (
                  <button
                    onClick={generateAllImages}
                    disabled={isGenerating || !question.imagePrompts?.length}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Generate All Images
                      </>
                    )}
                  </button>
                )}

                {/* Apply Accepted Images Button */}
                {Object.keys(acceptedImages).length > 0 && (
                  <button
                    onClick={() => {
                      // Apply all accepted images and close
                      onClose()
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Apply Images ({Object.keys(acceptedImages).length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}