import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

/**
 * Create authenticated Supabase client for server-side operations
 * Extracts Bearer token from request headers and configures client
 */
export function createAuthenticatedSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authentication required: Missing or invalid Authorization header')
  }
  
  const accessToken = authHeader.substring(7)
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      } 
    }
  })
}

/**
 * Extract user information from authenticated request
 * Returns user ID for database operations
 */
export async function getUserFromAuthenticatedRequest(request: NextRequest) {
  try {
    const supabase = createAuthenticatedSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Check if it's a network/timeout error vs auth error
      if (error.message?.includes('Connect Timeout') || error.message?.includes('fetch failed')) {
        throw new Error(`Supabase connection timeout: ${error.message}`)
      }
      throw new Error(`Authentication error: ${error.message}`)
    }
    
    if (!user) {
      throw new Error('No authenticated user found')
    }
    
    return { user, supabase }
  } catch (error) {
    // Preserve the original error message to help distinguish between auth vs network issues
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    
    // Check for specific network/timeout errors
    if (errorMessage.includes('Connect Timeout') || errorMessage.includes('fetch failed')) {
      throw new Error(`Network connection timeout to Supabase: ${errorMessage}`)
    }
    
    throw new Error(errorMessage)
  }
}