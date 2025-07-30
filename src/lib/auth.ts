import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

// Sign up new user
export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ User signed up successfully')
    return { success: true, user: data.user ?? undefined }

  } catch (err) {
    console.error('Unexpected signup error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

// Sign in existing user
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Signin error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ User signed in successfully')
    return { success: true, user: data.user ?? undefined }

  } catch (err) {
    console.error('Unexpected signin error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

// Sign out user
export const signOut = async (): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Signout error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ User signed out successfully')
    return { success: true }

  } catch (err) {
    console.error('Unexpected signout error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (err) {
    console.error('Error getting current user:', err)
    return null
  }
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser()
  return user !== null
}
