import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CreateSessionRequest, CreateSessionResponse } from '@/types/liveQuiz';

// Generate a unique 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if PIN is unique
async function isPinUnique(pin: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  
  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .select('pin')
    .eq('pin', pin)
    .eq('status', 'waiting')
    .single();

  return error !== null || data === null;
}

// Generate a unique PIN by retrying if collision occurs
async function generateUniquePin(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const pin = generatePin();
    const isUnique = await isPinUnique(pin);
    
    if (isUnique) {
      return pin;
    }
    
    attempts++;
  }

  throw new Error('Failed to generate unique PIN after multiple attempts');
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateSessionRequest = await req.json();
    const { game_id, participant_limit = 50 } = body;

    // Validate input
    if (!game_id) {
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'game_id is required' },
        { status: 400 }
      );
    }

    if (participant_limit < 1 || participant_limit > 200) {
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'participant_limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify game ownership
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, user_id, title')
      .eq('id', game_id)
      .eq('user_id', user.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'Game not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique PIN
    const pin = await generateUniquePin();

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'Service configuration error' },
        { status: 503 }
      );
    }

    // Create live session using admin client (bypasses RLS after ownership verification)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('live_sessions')
      .insert({
        game_id,
        host_id: user.id,
        pin,
        participant_limit,
        status: 'waiting',
        current_question_index: 0
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating live session:', sessionError);
      return NextResponse.json<CreateSessionResponse>(
        { success: false, error: 'Failed to create live session' },
        { status: 500 }
      );
    }

    return NextResponse.json<CreateSessionResponse>({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error in create session API:', error);
    return NextResponse.json<CreateSessionResponse>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
