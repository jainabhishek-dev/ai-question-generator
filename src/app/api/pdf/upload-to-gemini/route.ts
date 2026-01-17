import { NextRequest, NextResponse } from 'next/server'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request: NextRequest) {
  let tempPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // 10MB limit
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    tempPath = join(tmpdir(), `${Date.now()}-${file.name}`)
    await writeFile(tempPath, buffer)

    // Upload to Gemini Files API
    const apiKey = process.env.GEMINI_API_KEY_SERVER || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const fileManager = new GoogleAIFileManager(apiKey)
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: 'application/pdf',
      displayName: file.name
    })

    // Cleanup temp file
    await unlink(tempPath)
    tempPath = null

    return NextResponse.json({
      success: true,
      fileUri: uploadResult.file.uri,
      fileName: file.name,
      mimeType: 'application/pdf'
    })

  } catch (error) {
    // Cleanup temp file on error
    if (tempPath) {
      try {
        await unlink(tempPath)
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError)
      }
    }

    console.error('PDF upload error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload PDF'
      },
      { status: 500 }
    )
  }
}
