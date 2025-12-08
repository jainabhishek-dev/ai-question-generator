'use client'

import React, { useState } from 'react'
import NextImage from 'next/image'
import { X, Image, CheckCircle, Clock, RefreshCw, Eye } from 'lucide-react'
import type { GeneratedImage } from '@/types/question'
import type { Question as ParsedQuestion } from '@/lib/questionParser'
import Portal from './Portal'
import { useAuth } from '@/contexts/AuthContext'

interface ImageManagementModalProps {
  isOpen: boolean
  onClose: () => void
  question: ParsedQuestion
  images: GeneratedImage[]
  onImageSelect: (imageId: string, placeholder: string, isSelected: boolean) => void
  onRefreshImages?: () => void
}

export default function ImageManagementModal({
  isOpen,
  onClose,
  question,
  images,
  onImageSelect,
  onRefreshImages
}: ImageManagementModalProps) {
  const { user } = useAuth()
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Group images by placement_type (WHERE the image goes, not WHAT it shows)
  const imagesByPlaceholder = images.reduce((acc, image) => {
    // Use placement_type for new schema, fallback to placement for legacy, default to 'question'
    const key = ('placement_type' in image ? image.placement_type : image.placement) || 'question'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(image)
    return acc
  }, {} as Record<string, GeneratedImage[]>)

  // Handle image selection
  const handleImageSelect = async (image: GeneratedImage) => {
    if (!image.prompt_text || !user?.accessToken) return
    
    setIsSelecting(true)
    setSelectedImageId(image.id)
    
    try {
      // Call the API to update image selection
      const response = await fetch('/api/images/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          image_id: image.id,
          prompt_id: image.prompt_id
        })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to select image')
      }

      console.log('✅ Image selected successfully:', image.id)
      
      // Call the parent callback
      await onImageSelect(image.id, image.prompt_text, true)
      
      // Refresh images if callback provided
      if (onRefreshImages) {
        onRefreshImages()
      }
    } catch (error) {
      console.error('Failed to select image:', error)
    } finally {
      setIsSelecting(false)
      setSelectedImageId(null)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Unknown date'
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Image className="w-6 h-6 text-blue-600" aria-label="Image management icon" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Manage Educational Images
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Question {question.id} • {Object.keys(imagesByPlaceholder).length} placeholder(s) • {images.length} image(s)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onRefreshImages && (
                <button
                  onClick={onRefreshImages}
                  className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {Object.keys(imagesByPlaceholder).length === 0 ? (
              <div className="p-8 text-center">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-label="No images icon" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Images Generated Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Generate some images first to manage them here.
                </p>
              </div>
            ) : (
              <div className="space-y-8 p-6">
                {Object.entries(imagesByPlaceholder).map(([placeholder, placeholderImages]) => (
                  <div key={placeholder} className="space-y-4">
                    
                    {/* Placeholder Header */}
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Image Placeholder
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        &ldquo;{placeholder}&rdquo;
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {placeholderImages.length} image{placeholderImages.length !== 1 ? 's' : ''} • 
                        {placeholderImages.filter(img => img.is_selected).length} selected
                      </p>
                    </div>

                    {/* Images Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {placeholderImages
                        .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
                        .map((image) => (
                          <div
                            key={image.id}
                            className={`relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border-2 transition-all ${
                              image.is_selected 
                                ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-900' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                          >
                            
                            {/* Image */}
                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                              <NextImage
                                src={image.image_url}
                                alt={image.alt_text || 'Generated educational image'}
                                className="w-full h-full object-cover"
                                width={300}
                                height={300}
                                unoptimized
                              />
                              
                              {/* Selection Status Overlay */}
                              {image.is_selected && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                              )}
                              
                              {/* Loading Overlay */}
                              {isSelecting && selectedImageId === image.id && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                              )}
                            </div>

                            {/* Image Details */}
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Attempt #{image.attempt_number}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  image.is_selected 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                  {image.is_selected ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                {formatDate(image.generated_at)}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleImageSelect(image)}
                                  disabled={image.is_selected || isSelecting}
                                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                    image.is_selected
                                      ? 'bg-green-100 text-green-800 cursor-default'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200'
                                  }`}
                                >
                                  {image.is_selected ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Selected
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      Use This
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Select images to display in your question. Only one image per placeholder can be active.
              </div>
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}