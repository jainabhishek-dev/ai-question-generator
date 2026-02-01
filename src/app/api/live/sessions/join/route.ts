import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { JoinSessionRequest, JoinSessionResponse } from '@/types/liveQuiz';
import { broadcastParticipantJoined } from '@/lib/liveQuizService';

export async function POST(req: NextRequest) {
  try {
    const body: JoinSessionRequest = await req.json();
    const { session_id, nickname, avatar } = body;

    // Validate input
    if (!session_id) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'session_id is required' },
        { status: 400 }
      );
    }

    if (!nickname || nickname.trim().length < 3 || nickname.trim().length > 50) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'Nickname must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    if (!avatar) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'avatar is required' },
        { status: 400 }
      );
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'Service configuration error' },
        { status: 503 }
      );
    }

    // Verify session exists and is in waiting status
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('live_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'waiting') {
      return NextResponse.json<JoinSessionResponse>(
        { 
          success: false, 
          error: session.status === 'active' 
            ? 'This session has already started' 
            : 'This session has ended' 
        },
        { status: 400 }
      );
    }

    // Check participant limit
    const { count: participantCount, error: countError } = await supabaseAdmin
      .from('live_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting participants:', countError);
    }

    if (participantCount !== null && participantCount >= session.participant_limit) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'This session is full' },
        { status: 400 }
      );
    }

    // Check for duplicate nickname in this session
    const { data: existingParticipant } = await supabaseAdmin
      .from('live_participants')
      .select('nickname')
      .eq('session_id', session_id)
      .eq('nickname', nickname.trim())
      .single();

    if (existingParticipant) {
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'This nickname is already taken in this session' },
        { status: 400 }
      );
    }

    // Create participant
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('live_participants')
      .insert({
        session_id,
        nickname: nickname.trim(),
        avatar,
        score: 0,
        correct_answers: 0,
        current_streak: 0,
        max_streak: 0,
        answers: [],
        is_active: true
      })
      .select()
      .single();

    if (participantError) {
      console.error('Error creating participant:', participantError);
      return NextResponse.json<JoinSessionResponse>(
        { success: false, error: 'Failed to join session' },
        { status: 500 }
      );
    }

    // Broadcast participant joined event
    try {
      await broadcastParticipantJoined(session_id, participant);
    } catch (broadcastError) {
      console.error('Error broadcasting participant joined:', broadcastError);
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json<JoinSessionResponse>({
      success: true,
      participant
    });

  } catch (error) {
    console.error('Error in join session API:', error);
    return NextResponse.json<JoinSessionResponse>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
