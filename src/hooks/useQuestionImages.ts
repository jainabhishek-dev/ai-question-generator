import useSWR from 'swr'
import { GeneratedImage } from '@/types/question'
import { useAuth } from '@/contexts/AuthContext'

interface UseQuestionImagesOptions {
  enabled?: boolean
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

const fetcher = async (url: string, token: string): Promise<GeneratedImage[]> => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch images: ${response.status}`)
  }

  const result = await response.json()
  if (!result.success || !result.data) {
    return []
  }

  return result.data
}

export function useQuestionImages(
  questionId: number | null | undefined,
  options: UseQuestionImagesOptions = {}
) {
  const { user } = useAuth()
  const {
    enabled = true,
    revalidateOnFocus = false,
    dedupingInterval = 60000 // 1 minute
  } = options

  const shouldFetch = enabled && 
    questionId != null && 
    user?.accessToken && 
    typeof user.accessToken === 'string' && 
    user.accessToken.length > 10

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? [`/api/questions/${questionId}/images`, user.accessToken] : null,
    ([url, token]: [string, string]) => fetcher(url, token),
    {
      revalidateOnFocus,
      dedupingInterval,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      onError: (error) => {
        console.warn(`Failed to load images for question ${questionId}:`, error.message)
      }
    }
  )

  return {
    images: data || [],
    isLoading,
    error,
    refetch: mutate
  }
}