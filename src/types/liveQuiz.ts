// Live Quiz Multiplayer Type Definitions

export type SessionStatus = 'waiting' | 'active' | 'completed';

export interface LiveSession {
  id: string;
  game_id: string;
  host_id: string;
  pin: string;
  status: SessionStatus;
  current_question_index: number;
  participant_limit: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  total_participants?: number;
  average_score?: number;
  completion_rate?: number;
  session_duration_seconds?: number;
}

export interface LiveParticipant {
  id: string;
  session_id: string;
  nickname: string;
  avatar: string;
  score: number;
  correct_answers: number;
  current_streak: number;
  max_streak: number;
  answers: ParticipantAnswer[];
  joined_at: string;
  last_activity_at: string;
  is_active: boolean;
  final_rank?: number;
}

export interface ParticipantAnswer {
  question_index: number;
  answer: string;
  is_correct: boolean;
  time_taken: number;
  points_earned: number;
  streak: number;
}

// Real-time event types
export type RealtimeEventType = 
  | 'participant_joined'
  | 'participant_left'
  | 'session_started'
  | 'question_started'
  | 'answer_submitted'
  | 'question_ended'
  | 'leaderboard_updated'
  | 'session_ended';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: RealtimeEventPayload;
  timestamp: string;
}

// Event payload types for type safety
export type RealtimeEventPayload =
  | ParticipantJoinedPayload
  | ParticipantLeftPayload
  | SessionStartedPayload
  | QuestionStartedPayload
  | AnswerSubmittedPayload
  | QuestionEndedPayload
  | LeaderboardUpdatedPayload
  | SessionEndedPayload;

export interface ParticipantJoinedPayload {
  participant: LiveParticipant;
}

export interface ParticipantLeftPayload {
  participant_id: string;
  nickname: string;
}

export interface SessionStartedPayload {
  session_id: string;
  started_at: string;
}

export interface QuestionStartedPayload {
  question_index: number;
  timer_duration: number;
}

export interface AnswerSubmittedPayload {
  participant_id: string;
  nickname: string;
  question_index: number;
  is_correct: boolean;
  points_earned: number;
  new_score: number;
  streak: number;
}

export interface QuestionEndedPayload {
  question_index: number;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardUpdatedPayload {
  leaderboard: LeaderboardEntry[];
}

export interface SessionEndedPayload {
  session_id: string;
  completed_at: string;
  final_rankings: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  participant_id: string;
  nickname: string;
  avatar: string;
  score: number;
  correct_answers: number;
  max_streak: number;
  rank: number;
}

// Request/Response types for API endpoints

export interface CreateSessionRequest {
  game_id: string;
  participant_limit?: number;
}

export interface CreateSessionResponse {
  success: boolean;
  session?: LiveSession;
  error?: string;
}

export interface ValidatePinResponse {
  success: boolean;
  session?: LiveSession;
  participant_count?: number;
  error?: string;
}

export interface JoinSessionRequest {
  session_id: string;
  nickname: string;
  avatar: string;
}

export interface JoinSessionResponse {
  success: boolean;
  participant?: LiveParticipant;
  error?: string;
}

export interface StartSessionResponse {
  success: boolean;
  session?: LiveSession;
  error?: string;
}

export interface SubmitAnswerRequest {
  participant_id: string;
  question_index: number;
  answer: string;
  time_taken: number;
}

export interface SubmitAnswerResponse {
  success: boolean;
  participant?: LiveParticipant;
  points_earned?: number;
  is_correct?: boolean;
  correct_answer?: string;
  explanation?: string;
  error?: string;
}

export interface NextQuestionResponse {
  success: boolean;
  session?: LiveSession;
  is_last_question?: boolean;
  error?: string;
}

export interface EndSessionResponse {
  success: boolean;
  session?: LiveSession;
  final_rankings?: LeaderboardEntry[];
  error?: string;
}

// Emoji avatar pool
export const AVATAR_EMOJIS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', 
  '🐨', '🦁', '🐯', '🐸', '🐵',
  '🦄', '🦖', '🐙', '🦋', '🐝', '🦀'
] as const;

export type AvatarEmoji = typeof AVATAR_EMOJIS[number];

// Utility function to get random avatar
export function getRandomAvatar(): AvatarEmoji {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}
