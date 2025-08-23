import { NextRequest, NextResponse } from 'next/server'
import { saveContactMessage } from '@/lib/database'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  const result = await saveContactMessage(name, email, message)
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to save message.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}