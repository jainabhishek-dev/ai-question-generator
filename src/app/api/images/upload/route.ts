import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'
// import { uploadImageFromUrl } from '@/lib/imageStorage' // Currently unused

/**
 * POST /api/images/upload
 * Upload generated image blob to Supabase Storage (server-side)
 * This route only handles storage, not generation
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { user, supabase } = await getUserFromAuthenticatedRequest(request)

    console.log('📁 Processing image upload request')

    // Get form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const questionId = formData.get('questionId') as string
    const promptId = formData.get('promptId') as string

    if (!imageFile || !questionId || !promptId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: image, questionId, promptId' },
        { status: 400 }
      )
    }

    console.log('📝 Upload details:', {
      filename: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      questionId,
      promptId
    })

    // Convert file to buffer for storage
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create unique filename
    const timestamp = Date.now()
    const filename = `generated_${timestamp}.png`
    
    // Upload to Supabase Storage
    console.log('☁️ Uploading to Supabase Storage...')
    const { data: storageData, error: storageError } = await supabase.storage
      .from('images')
      .upload(`${user.id}/${questionId}/${filename}`, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (storageError) {
      console.error('❌ Storage upload error:', storageError)
      return NextResponse.json(
        { success: false, error: `Storage upload failed: ${storageError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(storageData.path)

    console.log('✅ Image uploaded successfully to:', publicUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storageData.path,
      metadata: {
        filename,
        size: imageFile.size,
        uploadedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error uploading image:', error)
    
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