'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getLiveQuizService } from '@/lib/liveQuizService';
import type { LiveSession, LiveParticipant } from '@/types/liveQuiz';
import LoadingSpinner from '@/components/LoadingSpinner';
import CountdownAnimation from '@/components/live/CountdownAnimation';
import ConfirmStartQuizModal from '@/components/live/ConfirmStartQuizModal';
import { Users, Copy, Check, AlertCircle } from 'lucide-react';

export default function HostLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const countdownTriggeredRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    const liveService = getLiveQuizService();

    // Fetch initial session and participants
    const fetchData = async () => {
      try {
        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !sessionData) {
          throw new Error('Session not found');
        }

        setSession(sessionData);

        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('live_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('joined_at', { ascending: true });

        if (!participantsError && participantsData) {
          setParticipants(participantsData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setLoading(false);
      }
    };

    fetchData();

    // Join realtime channel
    liveService.joinSession(sessionId);

    // Set up ALL event listeners BEFORE subscribing
    // Subscribe to broadcast events for real-time participant joins
    liveService.subscribeToEvents('participant_joined', (event) => {
      console.log('Participant joined event received:', event);
      // Fetch updated participant list
      const fetchParticipants = async () => {
        const { data } = await supabase
          .from('live_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('joined_at', { ascending: true });
        
        if (data) {
          setParticipants(data);
        }
      };
      fetchParticipants();
    });

    // Subscribe to session started event (same as participants)
    liveService.subscribeToEvents('session_started', () => {
      console.log('Session started - showing countdown');
      countdownTriggeredRef.current = true;
      setShowCountdown(true);
      setStarting(false); // Reset loading immediately when broadcast arrives
    });

    // NOW subscribe the channel (only once)
    liveService.subscribe();

    return () => {
      liveService.leaveSession();
    };
  }, [sessionId, router]);

  const copyJoinLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/live/join?pin=${session.pin}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPin = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartQuiz = async () => {
    if (!session || starting) return;

    setStarting(true);

    try {
      const response = await fetch(`/api/live/sessions/${sessionId}?action=start`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      // Countdown will be triggered by broadcast event
      setShowConfirmModal(false);
      
      // Simple fallback for loading state only (no countdown trigger)
      setTimeout(() => {
        setStarting(false); // Reset loading state if still active
      }, 3000); // Longer timeout, only for error recovery
    } catch (err) {
      console.error('Error starting session:', err);
      alert(err instanceof Error ? err.message : 'Failed to start session');
      setStarting(false);
    }
  };

  const handleCountdownComplete = () => {
    router.push(`/live/host/${sessionId}/control`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <LoadingSpinner title="Setting Up..." message="Preparing your live quiz session..." />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Session Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This session does not exist or has ended.'}
          </p>
          <button
            onClick={() => router.push('/my-games')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to My Games
          </button>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return <CountdownAnimation onComplete={handleCountdownComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Live Quiz Lobby
          </h1>
          <p className="text-xl text-gray-300">
            Waiting for participants to join...
          </p>
        </div>

        {/* PIN Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-6">
          <div className="text-center">
            <p className="text-lg text-gray-300 mb-2">Join PIN:</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-7xl font-bold text-white tracking-widest font-mono">
                {session.pin}
              </div>
              <button
                onClick={copyPin}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-green-400" />
                ) : (
                  <Copy className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Participants can join at: {window.location.origin}/live/join
            </p>
            <button
              onClick={copyJoinLink}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm"
            >
              {copied ? '✓ Copied!' : 'Copy Join Link'}
            </button>
          </div>
        </div>

        {/* Participant Count */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Participants
              </h2>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {participants.length} / {session.participant_limit}
            </div>
          </div>

          {/* Participants List */}
          {participants.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center hover:scale-105 transition-transform"
                >
                  <div className="text-4xl mb-2">{participant.avatar}</div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {participant.nickname}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No participants yet. Share the PIN to get started!
              </p>
            </div>
          )}
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={starting}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-green-500/50 transform hover:scale-105"
          >
            {starting ? (
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              `Start Quiz ${participants.length > 0 ? `(${participants.length} player${participants.length !== 1 ? 's' : ''})` : ''}`
            )}
          </button>
          <p className="text-sm text-gray-300 mt-4">
            You can start the quiz with any number of participants
          </p>
        </div>
      </div>

      {/* Confirm Start Modal */}
      {showConfirmModal && (
        <ConfirmStartQuizModal
          participantCount={participants.length}
          onConfirm={handleStartQuiz}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
