// Live Quiz Real-time Service
// Manages Supabase Realtime channels for live quiz sessions

import { supabase } from '@/lib/supabase';
import type { 
  RealtimeChannel, 
  RealtimeChannelSendResponse 
} from '@supabase/supabase-js';
import type { AnswerSubmittedPayload } from '@/types/liveQuiz';
import type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeEventPayload,
  LiveParticipant,
  LiveSession
} from '@/types/liveQuiz';

export class LiveQuizService {
  private channel: RealtimeChannel | null = null;
  private sessionId: string | null = null;
  private isSubscribed: boolean = false;

  /**
   * Join a live quiz session channel
   */
  joinSession(sessionId: string): RealtimeChannel {
    this.sessionId = sessionId;
    const channelName = `live_quiz:${sessionId}`;

    // Leave existing channel if any
    if (this.channel) {
      this.leaveSession();
    }

    // Create and join new channel
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: sessionId }
      }
    });

    this.isSubscribed = false;

    return this.channel;
  }

  /**
   * Leave the current session channel
   */
  async leaveSession(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
      this.sessionId = null;
      this.isSubscribed = false;
    }
  }

  /**
   * Subscribe to real-time events
   */
  subscribeToEvents(
    eventType: RealtimeEventType | '*',
    callback: (event: RealtimeEvent) => void
  ): void {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    // Subscribe to broadcast events
    this.channel.on(
      'broadcast',
      { event: eventType },
      (payload) => {
        const event: RealtimeEvent = {
          type: payload.event as RealtimeEventType,
          payload: payload.payload,
          timestamp: new Date().toISOString()
        };
        callback(event);
      }
    );
    // NO .subscribe() call here - must call subscribe() explicitly after all listeners are set up
  }

  /**
   * Subscribe to the channel - MUST be called after setting up all listeners
   */
  subscribe(): void {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    if (this.isSubscribed) {
      console.warn('Channel already subscribed');
      return;
    }

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to live quiz session: ${this.sessionId}`);
        this.isSubscribed = true;
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Channel error for session: ${this.sessionId}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`⏱️ Channel timed out for session: ${this.sessionId}`);
      } else if (status === 'CLOSED') {
        console.log(`🔒 Channel closed for session: ${this.sessionId}`);
      }
    });
  }

  /**
   * Broadcast an event to all participants
   */
  async broadcastEvent(
    eventType: RealtimeEventType,
    payload: RealtimeEventPayload
  ): Promise<RealtimeChannelSendResponse> {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    return await this.channel.send({
      type: 'broadcast',
      event: eventType,
      payload
    });
  }

  /**
   * Track presence (for disconnect detection)
   */
  async trackPresence(participantId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    await this.channel.track({
      participant_id: participantId,
      online_at: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Untrack presence
   */
  async untrackPresence(): Promise<void> {
    if (!this.channel) {
      return;
    }

    await this.channel.untrack();
  }

  /**
   * Subscribe to presence changes (for disconnect detection)
   */
  subscribeToPresence(
    onJoin: (key: string, current: unknown, previous: unknown) => void,
    onLeave: (key: string, current: unknown, previous: unknown) => void
  ): void {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    this.channel
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        onJoin(key, newPresences, null);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        onLeave(key, null, leftPresences);
      });
  }

  /**
   * Get current presence state
   */
  getPresenceState(): Record<string, unknown[]> {
    if (!this.channel) {
      throw new Error('No active channel. Call joinSession first.');
    }

    return this.channel.presenceState();
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.channel !== null;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
}

// Singleton instance for global use
let liveQuizServiceInstance: LiveQuizService | null = null;

export function getLiveQuizService(): LiveQuizService {
  if (!liveQuizServiceInstance) {
    liveQuizServiceInstance = new LiveQuizService();
  }
  return liveQuizServiceInstance;
}

// Export convenience functions
export async function broadcastParticipantJoined(
  sessionId: string,
  participant: LiveParticipant
): Promise<void> {
  const service = new LiveQuizService();
  const channel = service.joinSession(sessionId);
  
  // Subscribe and wait for confirmation with timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(new Error('Channel error'));
      }
    });
  });
  
  // Now broadcast
  await service.broadcastEvent('participant_joined', { participant });
  
  // Longer delay to ensure message propagates
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await service.leaveSession();
}

export async function broadcastSessionStarted(
  sessionId: string,
  startedAt: string
): Promise<void> {
  const service = new LiveQuizService();
  const channel = service.joinSession(sessionId);
  
  // Subscribe and wait for confirmation with timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(new Error('Channel error'));
      }
    });
  });
  
  // Now broadcast
  await service.broadcastEvent('session_started', { session_id: sessionId, started_at: startedAt });
  
  // Longer delay to ensure message propagates
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await service.leaveSession();
}

export async function broadcastQuestionStarted(
  sessionId: string,
  questionIndex: number,
  timerDuration: number
): Promise<void> {
  const service = new LiveQuizService();
  const channel = service.joinSession(sessionId);
  
  // Subscribe and wait for confirmation with timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(new Error('Channel error'));
      }
    });
  });
  
  // Now broadcast
  await service.broadcastEvent('question_started', { 
    question_index: questionIndex,
    timer_duration: timerDuration
  });
  
  // Longer delay to ensure message propagates
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await service.leaveSession();
}

export async function broadcastAnswerSubmitted(
  sessionId: string,
  participantId: string
): Promise<void> {
  const service = new LiveQuizService();
  const channel = service.joinSession(sessionId);
  
  // Subscribe and wait for confirmation with timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(new Error('Channel error'));
      }
    });
  });
  
  // Broadcast the event (minimal payload - host only needs participant_id)
  await service.broadcastEvent('answer_submitted', { 
    participant_id: participantId 
  } as AnswerSubmittedPayload);
  
  // Delay to ensure message propagates
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await service.leaveSession();
}

export async function broadcastSessionEnded(
  sessionId: string,
  completedAt: string,
  finalRankings: Array<{
    participant_id: string;
    nickname: string;
    avatar: string;
    score: number;
    correct_answers: number;
    max_streak: number;
    rank: number;
  }>
): Promise<void> {
  const service = new LiveQuizService();
  const channel = service.joinSession(sessionId);
  
  // Subscribe and wait for confirmation with timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(new Error('Channel error'));
      }
    });
  });
  
  // Now broadcast
  await service.broadcastEvent('session_ended', { 
    session_id: sessionId,
    completed_at: completedAt,
    final_rankings: finalRankings
  });
  
  // Longer delay to ensure message propagates
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await service.leaveSession();
}
