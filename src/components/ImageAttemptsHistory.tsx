'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  PhotoIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  StarIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import type { GeneratedImage, ImagePrompt } from '@/types/question'

interface ImageAttemptsHistoryProps {
  isOpen: boolean
  onClose: () => void
  imagePrompt: ImagePrompt
  attempts: GeneratedImage[]
  onSelectImage: (imageId: string) => void
  onRateImage: (imageId: string, rating: number) => void
  onDeleteImage: (imageId: string) => void
  onRegenerateImage: (promptId: string) => void
}

export default function ImageAttemptsHistory({
  isOpen,
  onClose,
  imagePrompt,
  attempts,
  onSelectImage,
  onRateImage,
  onDeleteImage,
  onRegenerateImage
}: ImageAttemptsHistoryProps) {
  const [selectedAttempt, setSelectedAttempt] = useState<GeneratedImage | null>(null)
  const [userRatings, setUserRatings] = useState<{ [imageId: string]: number }>({})
  const [favoriteImages, setFavoriteImages] = useState<Set<string>>(new Set())

  // Load user ratings and favorites from local storage or API
  useEffect(() => {
    // Initialize ratings from the attempts data
    const ratings: { [imageId: string]: number } = {}
    attempts.forEach(attempt => {
      if (attempt.user_rating) {
        ratings[attempt.id] = attempt.user_rating
      }
    })
    setUserRatings(ratings)
  }, [attempts])

  const handleRating = (imageId: string, rating: number) => {
    setUserRatings(prev => ({ ...prev, [imageId]: rating }))
    onRateImage(imageId, rating)
  }

  const toggleFavorite = (imageId: string) => {
    setFavoriteImages(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(imageId)) {
        newFavorites.delete(imageId)
      } else {
        newFavorites.add(imageId)
      }
      return newFavorites
    })
  }

  const getAccuracyStatusColor = (feedback?: string) => {
    switch (feedback) {
      case 'correct': return 'text-green-500 bg-green-50 border-green-200'
      case 'partially_correct': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'incorrect': return 'text-red-500 bg-red-50 border-red-200'
      default: return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  const getAccuracyIcon = (feedback?: string) => {
    switch (feedback) {
      case 'correct': return <CheckCircleIcon className="w-4 h-4" />
      case 'partially_correct': return <ClockIcon className="w-4 h-4" />
      case 'incorrect': return <XMarkIcon className="w-4 h-4" />
      default: return <PhotoIcon className="w-4 h-4" />
    }
  }

  const sortedAttempts = [...attempts].sort((a, b) => {
    // Sort by: selected first, then by rating, then by date
    if (a.is_selected && !b.is_selected) return -1
    if (!a.is_selected && b.is_selected) return 1
    
    const aRating = userRatings[a.id] || a.user_rating || 0
    const bRating = userRatings[b.id] || b.user_rating || 0
    if (aRating !== bRating) return bRating - aRating
    
    return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Left Panel - Image List */}
        <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Generation History</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">{attempts.length} attempts</p>
          </div>

          {/* Attempt List */}
          <div className="p-2 space-y-2">
            {sortedAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`relative bg-white rounded-lg border-2 transition-all cursor-pointer ${
                  selectedAttempt?.id === attempt.id
                    ? 'border-blue-500 shadow-md'
                    : attempt.is_selected
                    ? 'border-green-400 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAttempt(attempt)}
              >
                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  {attempt.is_selected && (
                    <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-xs font-medium">
                      Selected
                    </span>
                  )}
                  {favoriteImages.has(attempt.id) && (
                    <HeartIconSolid className="w-4 h-4 text-red-500" />
                  )}
                </div>

                {/* Image Thumbnail */}
                <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                  <Image
                    src={attempt.image_url}
                    alt={`Attempt ${attempt.attempt_number}`}
                    className="w-full h-full object-cover"
                    width={300}
                    height={300}
                    unoptimized
                  />
                </div>

                {/* Image Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-900">
                      Attempt #{attempt.attempt_number}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRating(attempt.id, star)
                          }}
                          className="text-xs hover:scale-110 transition-transform"
                        >
                          {(userRatings[attempt.id] || attempt.user_rating || 0) >= star ? (
                            <StarIconSolid className="w-3 h-3 text-yellow-400" />
                          ) : (
                            <StarIcon className="w-3 h-3 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accuracy Status */}
                  {attempt.accuracy_feedback && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getAccuracyStatusColor(attempt.accuracy_feedback)}`}>
                      {getAccuracyIcon(attempt.accuracy_feedback)}
                      {attempt.accuracy_feedback.replace('_', ' ')}
                    </div>
                  )}

                  {/* Generated Time */}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(attempt.generated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {/* Generate New Attempt Button */}
            <button
              onClick={() => onRegenerateImage(imagePrompt.id)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <ArrowPathIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">Generate New Attempt</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Detailed View */}
        <div className="flex-1 overflow-y-auto">
          {selectedAttempt ? (
            <div className="p-6">
              {/* Image Actions */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Attempt #{selectedAttempt.attempt_number}
                </h2>
                
                <div className="flex items-center gap-2">
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(selectedAttempt.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      favoriteImages.has(selectedAttempt.id)
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {favoriteImages.has(selectedAttempt.id) ? (
                      <HeartIconSolid className="w-4 h-4" />
                    ) : (
                      <HeartIcon className="w-4 h-4" />
                    )}
                  </button>

                  {/* Select Button */}
                  <button
                    onClick={() => onSelectImage(selectedAttempt.id)}
                    disabled={selectedAttempt.is_selected}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAttempt.is_selected
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {selectedAttempt.is_selected ? 'Currently Selected' : 'Use This Image'}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this image?')) {
                        onDeleteImage(selectedAttempt.id)
                      }
                    }}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Full Size Image */}
              <div className="bg-gray-100 rounded-lg overflow-hidden mb-6">
                <Image
                  src={selectedAttempt.image_url}
                  alt={`Generated image attempt ${selectedAttempt.attempt_number}`}
                  className="w-full max-h-96 object-contain"
                  width={800}
                  height={600}
                  unoptimized
                />
              </div>

              {/* Image Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Prompt Used */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Prompt Used</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedAttempt.prompt_used}
                  </p>
                </div>

                {/* Technical Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Technical Details</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>Generated: {new Date(selectedAttempt.generated_at).toLocaleString()}</div>
                    {selectedAttempt.file_size_bytes && (
                      <div>Size: {(selectedAttempt.file_size_bytes / 1024).toFixed(1)} KB</div>
                    )}
                    {selectedAttempt.image_width && selectedAttempt.image_height && (
                      <div>Dimensions: {selectedAttempt.image_width} × {selectedAttempt.image_height}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-gray-900 mb-3">Rate This Image</h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating(selectedAttempt.id, star)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      {(userRatings[selectedAttempt.id] || selectedAttempt.user_rating || 0) >= star ? (
                        <StarIconSolid className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <StarIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    ({userRatings[selectedAttempt.id] || selectedAttempt.user_rating || 0}/5)
                  </span>
                </div>
              </div>

              {/* Accuracy Feedback */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Educational Accuracy</h3>
                <div className="flex gap-2">
                  {['correct', 'partially_correct', 'incorrect'].map(feedback => (
                    <button
                      key={feedback}
                      onClick={() => {
                        // Here you would call an API to update accuracy feedback
                        console.log('Update accuracy feedback:', feedback)
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        selectedAttempt.accuracy_feedback === feedback
                          ? getAccuracyStatusColor(feedback)
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {getAccuracyIcon(feedback)}
                      <span className="ml-1">{feedback.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Help improve future generations by rating the educational accuracy
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Image Selected</h3>
                <p className="text-gray-600">Select an image from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}