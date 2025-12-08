import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import type { GeneratedImage, QuestionImage } from '@/types/question'
import { extractImagePlaceholders } from '@/lib/questionParser'

/**
 * Get the selected image for each placement, fallback to latest if none selected
 * Prioritizes user-selected images over most recent by date
 * Updated to handle both GeneratedImage and QuestionImage types
 * Groups by placement_type instead of prompt_text for proper image selection
 */
const getSelectedImagesPerPlaceholder = (images: (GeneratedImage | QuestionImage)[]): (GeneratedImage | QuestionImage)[] => {
  // Group images by placement_type (WHERE the image goes, not WHAT it shows)
  const imagesByPlacement = images.reduce((acc, image) => {
    // Use placement_type for new schema, fallback to placement for legacy
    const key = ('placement_type' in image ? image.placement_type : image.placement) || 'question'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(image)
    return acc
  }, {} as Record<string, (GeneratedImage | QuestionImage)[]>)

  // Get the selected image for each placement (or latest if none selected)
  const selectedImages: (GeneratedImage | QuestionImage)[] = []
  
  Object.values(imagesByPlacement).forEach((placementImages) => {
    // First try to find the selected image
    const selectedImage = placementImages.find(img => img.is_selected === true)
    
    if (selectedImage) {
      // Use the selected image
      selectedImages.push(selectedImage)
    } else {
      // Fallback: Sort by generated_at descending (latest first)
      const sortedImages = placementImages.sort((a, b) => 
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      )
      
      // Take the most recent image as fallback
      const latestImage = sortedImages[0]
      if (latestImage) {
        selectedImages.push(latestImage)
      }
    }
  })

  return selectedImages
}

interface ImageRendererProps {
  content: string
  generatedImages?: GeneratedImage[]
  showPlaceholders?: boolean
  className?: string
  // New schema props
  questionId?: number
  placementType?: string
}

const ImageRenderer: React.FC<ImageRendererProps> = ({
  content,
  generatedImages = [],
  showPlaceholders = false,
  className = '',
  questionId,
  placementType
}) => {
  const [newSchemaImages] = useState<QuestionImage[]>([])
  const [loading] = useState(false)

  // Disable new schema image fetching to prevent authentication storms
  // Images are now properly managed through the main page's loadImagesForQuestion function
  useEffect(() => {
    // TODO: Re-enable with proper authentication context if needed
  }, [questionId, placementType])

  // Extract placeholders from content
  const placeholders = extractImagePlaceholders(content)
  
  // Determine which images to use - prioritize new schema
  const imagesToUse = newSchemaImages.length > 0 ? newSchemaImages : generatedImages
  
  // Get latest images per placeholder for default display
  const selectedImages = getSelectedImagesPerPlaceholder(imagesToUse)
  
  // Replace placeholders with actual images or placeholder UI
  const renderContent = () => {
    let processedContent = content
    
    // If loading, show loading placeholders
    if (loading && questionId) {
      placeholders.forEach((placeholder) => {
        processedContent = processedContent.replace(placeholder.fullMatch, `**[🔄 Loading image...]**`)
      })
      return processedContent
    }
    
    placeholders.forEach((placeholder) => {
      // Determine the placement_type for this text placeholder
      // For now, all placeholders in the content default to the provided placementType or 'question'
      const currentPlacementType = placementType || 'question'
      
      // Find the selected image for this placement_type (1 image per placement model)
      const matchingImage = selectedImages.find((img: GeneratedImage | QuestionImage) => {
        // Match by placement_type for new schema
        if ('placement_type' in img) {
          return img.placement_type === currentPlacementType
        }
        // Match by placement for legacy schema
        if ('placement' in img) {
          return img.placement === currentPlacementType
        }
        // Fallback: if no placement info, assume it's for 'question'
        return currentPlacementType === 'question'
      })
      

      
      if (matchingImage && !showPlaceholders) {
        // Replace with image markdown - use fullMatch (the actual placeholder text) not placeholder name
        const imageMarkdown = `![${placeholder.description}](${matchingImage.image_url} "${placeholder.description}")`

        processedContent = processedContent.replace(placeholder.fullMatch, imageMarkdown)

      } else if (showPlaceholders) {
        // Show placeholder text - use fullMatch (the actual placeholder text)
        processedContent = processedContent.replace(placeholder.fullMatch, `**[🖼️ Image: ${placeholder.description}]**`)
      } else {
        // Remove placeholder entirely for clean text - use fullMatch (the actual placeholder text)
        processedContent = processedContent.replace(placeholder.fullMatch, '')
      }
    })
    
    return processedContent
  }

  // Custom components for ReactMarkdown - Fixed hydration errors
  const components = {
    // Custom image component - returns simple img element to avoid hydration errors
    img: ({ src, alt, width, height, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (!src) return null;
      
      // Convert src to string if it's a Blob
      const srcUrl = typeof src === 'string' ? src : URL.createObjectURL(src);
      
      // Convert width/height to numbers with fallbacks
      const imageWidth = typeof width === 'number' ? width : typeof width === 'string' ? parseInt(width) || 400 : 400;
      const imageHeight = typeof height === 'number' ? height : typeof height === 'string' ? parseInt(height) || 300 : 300;
      
      return (
        <div className="my-4 relative max-w-md mx-auto">
          <Image 
            src={srcUrl}
            alt={alt || ''}
            width={imageWidth}
            height={imageHeight}
            className="rounded-lg border border-gray-300 w-full h-auto object-cover"
            loading="lazy"
            onLoad={() => {}}
            onError={() => {}}
            {...props}
          />
        </div>
      )
    },
    
    // Custom paragraph component - simplified to avoid nesting issues
    p: ({ children }: React.PropsWithChildren) => {
      // Check if paragraph contains images and handle differently
      const hasImages = React.Children.toArray(children).some(
        (child: React.ReactNode) => {
          if (React.isValidElement(child)) {
            const props = child.props as Record<string, unknown>;
            return child.type === 'img' || 
              (props && typeof props.src === 'string')
          }
          return false
        }
      )
      
      if (hasImages) {
        // For paragraphs with images, use a div to avoid <p><div> nesting
        return (
          <div className="leading-relaxed mb-4 text-sm sm:text-base">
            {children}
          </div>
        )
      }
      
      return (
        <p className="leading-relaxed mb-4 text-sm sm:text-base">
          {children}
        </p>
      )
    }
  }

  const finalContent = renderContent()
  
  // Debug: Log what's being passed to ReactMarkdown
  if (finalContent.includes('![')) {

  }

  return (
    <div className={`prose max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { breaks: true }], remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {finalContent}
      </ReactMarkdown>
    </div>
  )
}

export default ImageRenderer