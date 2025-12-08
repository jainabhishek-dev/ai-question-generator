import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'

/**
 * POST /api/images/save
 * Save image record to database after client-side generation and upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { user, supabase } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { prompt_id, image_url, prompt_used, original_description } = body

    // Validate required fields
    if (!prompt_id || !image_url || !prompt_used || !original_description) {
      return NextResponse.json(
        { success: false, error: 'prompt_id, image_url, prompt_used, and original_description are required' },
        { status: 400 }
      )
    }

    console.log('💾 Saving image record to database')
    console.log('🔗 Image URL:', image_url)
    console.log('📝 Prompt used:', prompt_used)

    // First, get the prompt record to extract question_id and placement
    const { data: promptRecord, error: promptError } = await supabase
      .from('image_prompts')
      .select('question_id, placement')
      .eq('id', prompt_id)
      .single()

    if (promptError || !promptRecord) {
      console.error('❌ Error fetching prompt record:', promptError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch prompt record' },
        { status: 400 }
      )
    }

    console.log('📋 Prompt record found - Question ID:', promptRecord.question_id, 'Placement:', promptRecord.placement)

    // Get current highest attempt number for this prompt
    const { data: existingAttempts } = await supabase
      .from('question_images')
      .select('attempt_number')
      .eq('prompt_id', prompt_id)
      .order('attempt_number', { ascending: false })
      .limit(1)

    const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

    // Insert new image record with proper question_id and placement_type
    const { data: newImage, error: insertError } = await supabase
      .from('question_images')
      .insert({
        prompt_id,
        image_url,
        prompt_used,
        attempt_number: nextAttemptNumber,
        is_selected: true, // Make this the active image
        user_id: user.id,
        alt_text: original_description, // Use original placeholder description for accessibility
        generated_at: new Date().toISOString(),
        question_id: promptRecord.question_id,  // ✅ Set the question_id from prompt record
        placement_type: promptRecord.placement  // ✅ Set the placement_type from prompt record
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error saving image record:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save image record to database' },
        { status: 500 }
      )
    }

    // Mark previous attempts as not selected
    await supabase
      .from('question_images')
      .update({ is_selected: false })
      .eq('prompt_id', prompt_id)
      .neq('id', newImage.id)

    // Update prompt status to generated
    await supabase
      .from('image_prompts')
      .update({ is_generated: true })
      .eq('id', prompt_id)

    console.log('✅ Image record saved successfully with ID:', newImage.id)

    return NextResponse.json({
      success: true,
      data: newImage,
      message: 'Image record saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving image record:', error)
    
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