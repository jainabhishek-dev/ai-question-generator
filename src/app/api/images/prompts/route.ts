import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'

/**
 * POST /api/images/prompts
 * Create a new image prompt record in the database
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { user, supabase } = await getUserFromAuthenticatedRequest(request)
    
    console.log('✅ Authenticated user:', user.id)

    const body = await request.json()
    const { question_id, prompt_text, placement, style_preference, original_ai_prompt } = body

    // Validate required fields
    if (!prompt_text) {
      return NextResponse.json(
        { success: false, error: 'prompt_text is required' },
        { status: 400 }
      )
    }

    console.log('💾 Creating image prompt record')
    console.log('📝 Prompt:', prompt_text)

    // Insert prompt record into database (matching actual schema)
    const { data: promptRecord, error: insertError } = await supabase
      .from('image_prompts')
      .insert([
        {
          question_id: question_id || null,
          prompt_text,
          original_ai_prompt: original_ai_prompt || prompt_text,
          placement: placement || 'question',
          style_preference: style_preference || 'educational_diagram',
          is_generated: false
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating prompt record:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create prompt record' },
        { status: 500 }
      )
    }

    console.log('✅ Prompt record created with ID:', promptRecord.id)

    return NextResponse.json({
      success: true,
      data: promptRecord
    })

  } catch (error) {
    console.error('❌ Error creating prompt:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/images/prompts
 * Get image prompts for a specific question or user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('question_id')
    
    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    let query = supabase
      .from('image_prompts')
      .select('*')
      .order('created_at', { ascending: false })

    if (questionId) {
      query = query.eq('question_id', questionId)
    }

    const { data: prompts, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Error fetching prompts:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch prompts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: prompts
    })

  } catch (error) {
    console.error('❌ Error fetching prompts:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/images/prompts
 * Update an existing image prompt
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { id, prompt_text, style_preference } = body

    // Validate required fields
    if (!id || !prompt_text) {
      return NextResponse.json(
        { success: false, error: 'id and prompt_text are required' },
        { status: 400 }
      )
    }

    console.log('🔄 Updating image prompt:', id)

    // Update prompt record (RLS policies ensure user owns the prompt)
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('image_prompts')
      .update({
        prompt_text,
        style_preference: style_preference || 'educational_diagram'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating prompt:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update prompt' },
        { status: 500 }
      )
    }

    console.log('✅ Prompt updated successfully')

    return NextResponse.json({
      success: true,
      data: updatedPrompt
    })

  } catch (error) {
    console.error('❌ Error updating prompt:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}