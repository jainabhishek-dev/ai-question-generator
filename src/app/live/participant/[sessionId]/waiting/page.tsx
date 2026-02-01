'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getLiveQuizService } from '@/lib/liveQuizService';
import type { LiveSession } from '@/types/liveQuiz';
import LoadingSpinner from '@/components/LoadingSpinner';
import CountdownAnimation from '@/components/live/CountdownAnimation';
import { Users, Clock } from 'lucide-react';

export default function ParticipantWaitingPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const liveService = getLiveQuizService();

    // Fetch initial session data
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setSession(data);

        // If already started, show countdown
        if (data.status === 'active') {
          setShowCountdown(true);
        }
      }

      setLoading(false);
    };

    // Fetch participant count
    const fetchParticipantCount = async () => {
      const { count } = await supabase
        .from('live_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_active', true);

      setParticipantCount(count || 0);
    };

    fetchSession();
    fetchParticipantCount();

    // Join realtime channel
    liveService.joinSession(sessionId);

    // Set up ALL event listeners BEFORE subscribing
    // Subscribe to session started event
    liveService.subscribeToEvents('session_started', () => {
      console.log('Session started event received');
      setShowCountdown(true);
    });

    // Subscribe to participant joined event to update count
    liveService.subscribeToEvents('participant_joined', () => {
      // Refresh participant count
      const refreshCount = async () => {
        const { count } = await supabase
          .from('live_participants')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('is_active', true);
        setParticipantCount(count || 0);
      };
      refreshCount();
    });

    // NOW subscribe the channel (only once)
    liveService.subscribe();

    return () => {
      liveService.leaveSession();
    };
  }, [sessionId, router]);

  const handleCountdownComplete = () => {
    router.push(`/live/participant/${sessionId}/play`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <LoadingSpinner title="Loading..." message="Connecting to quiz session..." />
      </div>
    );
  }

  if (showCountdown) {
    return <CountdownAnimation onComplete={handleCountdownComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="text-center max-w-md w-full">
        {/* Animated Icon */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
            <Clock className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Get Ready!
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Waiting for the host to start the quiz...
        </p>

        {/* Participant Count */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center gap-3 text-white">
            <Users className="w-6 h-6" />
            <span className="text-2xl font-bold">{participantCount}</span>
            <span className="text-lg">
              player{participantCount !== 1 ? 's' : ''} joined
            </span>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-400">
          The quiz will start automatically when the host begins.
          <br />
          Stay on this page!
        </p>
      </div>
    </div>
  );
}
