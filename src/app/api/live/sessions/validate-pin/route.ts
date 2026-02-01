import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ValidatePinResponse } from '@/types/liveQuiz';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pin = searchParams.get('pin');

    // Validate input
    if (!pin || pin.length !== 6) {
      return NextResponse.json<ValidatePinResponse>(
        { success: false, error: 'Invalid PIN format. PIN must be 6 digits.' },
        { status: 400 }
      );
    }

    // Find session by PIN
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('pin', pin)
      .single();

    if (sessionError || !session) {
      return NextResponse.json<ValidatePinResponse>(
        { success: false, error: 'Invalid PIN. Session not found.' },
        { status: 404 }
      );
    }

    // Check if session is in waiting status
    if (session.status !== 'waiting') {
      return NextResponse.json<ValidatePinResponse>(
        { 
          success: false, 
          error: session.status === 'active' 
            ? 'This session has already started.' 
            : 'This session has ended.' 
        },
        { status: 400 }
      );
    }

    // Get participant count
    const { count: participantCount, error: countError } = await supabase
      .from('live_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting participants:', countError);
    }

    return NextResponse.json<ValidatePinResponse>({
      success: true,
      session,
      participant_count: participantCount || 0
    });

  } catch (error) {
    console.error('Error in validate PIN API:', error);
    return NextResponse.json<ValidatePinResponse>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
