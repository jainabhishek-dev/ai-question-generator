/**
 * GAME SYSTEM TYPES
 * Type-safe interfaces matching GAME_DATABASE_SCHEMA.sql
 * All types follow database schema exactly - no mock values, production-ready
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type GameType =
  | 'quiz'
  | 'interactive_diagram'
  | 'draggable_geometry'
  | 'parameter_slider'
  | 'flashcard'
  | 'matching';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type DeviceType = 'web' | 'android' | 'ios';

export type QuitReason =
  | 'completed'
  | 'too_hard'
  | 'too_easy'
  | 'boring'
  | 'technical_issue'
  | 'interrupted';

export type AccuracyFeedback = 'correct' | 'partially_correct' | 'incorrect';

export type AchievementType = 'badge' | 'milestone' | 'streak' | 'mastery' | 'creator';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type TagType = 'topic' | 'skill' | 'curriculum' | 'feature';

// ============================================
// GAME CONFIGURATION TYPES
// ============================================

/**
 * Quiz Game Configuration
 */
export interface QuizGameConfig {
  questions: QuizQuestion[];
  settings: {
    time_limit: number; // Default time per question in seconds (5-180)
    hints_enabled: boolean;
    show_explanations: boolean;
  };
}

export interface QuizQuestion {
  question: string;
  question_type?: 'MCQ' | 'True/False' | 'FIB'; // Question type (defaults to MCQ for backward compatibility)
  options?: string[]; // MCQ: 4 options, True/False: 2 options, FIB: undefined
  correct_answer: string; // For MCQ/T/F: option text or letter, For FIB: answer text
  explanation: string;
  difficulty: Difficulty;
  points?: number; // Optional custom points (default: 100)
  time_limit?: number; // Per-question time limit in seconds (defaults to settings.time_limit)
  hint?: string; // Optional hint text
  question_id?: number; // Original question ID for loading images/metadata
  // FIB-specific options
  case_sensitive?: boolean; // For FIB: whether answer matching is case-sensitive (default: false)
}

/**
 * Interactive Diagram Configuration
 */
export interface InteractiveDiagramConfig {
  base_image_url: string; // AI-generated diagram URL
  hotspots: DiagramHotspot[];
  settings: {
    show_labels_initially: boolean;
    require_all_explored: boolean; // Must click all hotspots
    allow_hints: boolean;
  };
}

export interface DiagramHotspot {
  id: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  radius: number; // Click area radius in percentage
  label: string;
  description: string;
  revealed?: boolean; // Runtime state (not stored)
}

/**
 * Draggable Geometry Configuration
 */
export interface DraggableGeometryConfig {
  shape_type: 'triangle' | 'quadrilateral' | 'polygon' | 'circle';
  initial_vertices: Point[];
  constraints?: GeometryConstraint[];
  settings: {
    show_properties: ('sides' | 'angles' | 'area' | 'perimeter')[];
    enable_snap_to_grid: boolean;
    show_grid: boolean;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface GeometryConstraint {
  type: 'min_distance' | 'max_distance' | 'fixed_point' | 'angle_constraint';
  params: Record<string, number | string>;
}

/**
 * Parameter Slider Configuration
 */
export interface ParameterSliderConfig {
  equation: string; // e.g., "y = ax² + bx + c"
  parameters: SliderParameter[];
  visualization: 'graph' | 'animation' | 'diagram';
  settings: {
    x_range: [number, number];
    y_range: [number, number];
    show_equation: boolean;
    show_grid: boolean;
    animation_speed?: number; // For animation type
  };
}

export interface SliderParameter {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit?: string; // e.g., "°", "m/s", "%"
}

/**
 * Flashcard Configuration
 */
export interface FlashcardConfig {
  cards: FlashCard[];
  settings: {
    enable_spaced_repetition: boolean;
    shuffle_cards: boolean;
    show_progress: boolean;
  };
}

export interface FlashCard {
  id: string;
  front: string; // Question or term
  back: string; // Answer or definition
  difficulty: Difficulty;
  hint?: string;
  image_url?: string; // Optional visual aid
}

/**
 * Matching Game Configuration
 */
export interface MatchingConfig {
  pairs: MatchingPair[];
  settings: {
    time_limit?: number;
    allow_mistakes: number; // Max mistakes allowed
    shuffle: boolean;
  };
}

export interface MatchingPair {
  id: string;
  concept: string; // Left side
  definition: string; // Right side
  image_url?: string; // Optional visual
}

/**
 * Union type for all game configs
 */
export type GameConfig =
  | QuizGameConfig
  | InteractiveDiagramConfig
  | DraggableGeometryConfig
  | ParameterSliderConfig
  | FlashcardConfig
  | MatchingConfig;

// ============================================
// DATABASE TABLE TYPES
// ============================================

/**
 * Games Table
 */
export interface Game {
  // Primary identification
  id: string;

  // Game metadata
  title: string;
  description: string | null;
  topic: string;

  // Game type
  game_type: GameType;

  // Difficulty & subject
  difficulty: Difficulty;
  subject: string | null;
  grade_level: string | null;

  // Game configuration
  config: GameConfig;

  // Visual assets
  thumbnail_url: string | null;
  static_images: string[] | null; // JSONB array

  // Ownership & sharing
  user_id: string;
  is_public: boolean;
  share_code: string;
  allow_anonymous_play: boolean;

  // Game statistics
  total_plays: number;
  unique_players: number;
  avg_completion_rate: number | null;
  avg_score: number | null;
  avg_time_seconds: number | null;
  avg_stars: number | null;

  // Status
  is_active: boolean;
  is_featured: boolean;
  moderation_status: ModerationStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_played_at: string | null;
}

/**
 * Game Plays Table
 */
export interface GamePlay {
  // Primary identification
  id: string;

  // Game reference
  game_id: string;
  user_id: string | null; // NULL for anonymous
  player_name: string | null; // Display name (for both anonymous and logged-in users)

  // Session tracking
  session_id: string;
  device_type: DeviceType | null;

  // Universal metrics
  time_started: string;
  time_ended: string | null;
  time_taken_seconds: number | null;
  completed: boolean;
  completion_percentage: number | null;

  // Quiz-specific metrics
  points_earned: number | null;
  questions_correct: number | null;
  questions_total: number | null;
  max_streak: number | null;
  hints_used: number | null;
  lives_remaining: number | null;

  // Simulation-specific metrics
  stars_earned: number | null; // 0-3
  interactions_count: number | null;

  // Flashcard-specific metrics
  cards_reviewed: number | null;
  cards_mastered: number | null;
  avg_confidence: number | null;

  // Matching-specific metrics
  pairs_matched: number | null;
  pairs_total: number | null;
  mistakes_count: number | null;

  // Analytics
  feedback_rating: number | null; // 1-5
  feedback_text: string | null;
  quit_reason: QuitReason | null;

  // Timestamps
  created_at: string;
}

/**
 * Game Leaderboards Table
 */
export interface GameLeaderboard {
  // Composite primary key
  game_id: string;
  user_id: string;

  // Best performance
  best_score: number;
  best_time_seconds: number;
  best_accuracy: number;

  // Overall statistics
  total_plays: number;
  total_points: number;
  avg_score: number;

  // Achievements
  perfect_score_count: number;

  // Rank tracking
  global_rank: number | null;
  percentile: number | null;

  // Timestamps
  first_played_at: string;
  last_played_at: string;
  best_score_achieved_at: string;
}

/**
 * User Achievements Table
 */
export interface UserAchievement {
  // Primary identification
  id: string;

  // User reference
  user_id: string;

  // Achievement details
  achievement_type: AchievementType;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string | null;

  // Achievement metadata
  game_id: string | null;
  points_awarded: number;
  rarity: Rarity | null;

  // Display assets
  icon_url: string | null;
  badge_color: string | null;

  // Timestamps
  earned_at: string;
}

/**
 * Flashcard Progress Table
 */
export interface FlashcardProgress {
  // Primary identification
  id: string;

  // References
  user_id: string;
  game_id: string;
  card_index: number;

  // Spaced repetition algorithm
  easiness_factor: number; // 1.3 - 2.5
  interval_days: number;
  repetitions: number;

  // Mastery tracking
  mastery_level: number; // 0-100
  confidence_rating: number | null; // 1-5

  // Review history
  total_reviews: number;
  correct_reviews: number;
  last_review_result: AccuracyFeedback | null;

  // Timestamps
  last_reviewed_at: string | null;
  next_review_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Game Tags Table
 */
export interface GameTag {
  game_id: string;
  tag: string;
  tag_type: TagType;
  created_at: string;
}

/**
 * Game Comments Table
 */
export interface GameComment {
  // Primary identification
  id: string;

  // References
  game_id: string;
  user_id: string;
  parent_comment_id: string | null;

  // Comment content
  comment_text: string;

  // Engagement
  likes_count: number;
  is_pinned: boolean;
  is_edited: boolean;

  // Moderation
  is_flagged: boolean;
  is_hidden: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Game Likes Table
 */
export interface GameLike {
  game_id: string;
  user_id: string;
  created_at: string;
}

// ============================================
// RUNTIME STATE TYPES
// (Not stored in database, used in components)
// ============================================

/**
 * Quiz Game State (runtime)
 */
export interface QuizGameState {
  current_question: number;
  questions_answered: number;
  correct_answers: number;
  points: number;
  time_elapsed: number;
  streak: number;
  hints_used: number;
  answers: Record<number, string>; // question_index -> selected_answer
}

/**
 * Interactive Diagram State (runtime)
 */
export interface DiagramGameState {
  revealed_hotspots: string[]; // Array of hotspot IDs
  interactions_count: number;
  hints_used: number;
  completion_percentage: number;
}

/**
 * Draggable Geometry State (runtime)
 */
export interface GeometryGameState {
  vertices: Point[];
  interactions_count: number;
  properties_calculated: {
    sides?: number[];
    angles?: number[];
    area?: number;
    perimeter?: number;
  };
}

/**
 * Parameter Slider State (runtime)
 */
export interface ParameterSliderState {
  parameter_values: Record<string, number>; // parameter_name -> current_value
  interactions_count: number;
}

/**
 * Flashcard State (runtime)
 */
export interface FlashcardGameState {
  current_card_index: number;
  cards_reviewed: number;
  cards_mastered: number;
  showing_back: boolean;
}

/**
 * Matching Game State (runtime)
 */
export interface MatchingGameState {
  selected_concept: string | null;
  selected_definition: string | null;
  matched_pairs: string[]; // Array of pair IDs
  mistakes_count: number;
  time_elapsed: number;
}

/**
 * Union type for all game states
 */
export type GameState =
  | QuizGameState
  | DiagramGameState
  | GeometryGameState
  | ParameterSliderState
  | FlashcardGameState
  | MatchingGameState;

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Create Game Request
 */
export interface CreateGameRequest {
  title: string;
  description?: string;
  topic: string;
  game_type: GameType;
  difficulty: Difficulty;
  subject?: string;
  grade_level?: string;
  config: GameConfig;
  thumbnail_url?: string;
  is_public?: boolean;
  allow_anonymous_play?: boolean;
  tags?: string[];
}

/**
 * Update Game Request
 */
export interface UpdateGameRequest {
  title?: string;
  description?: string;
  topic?: string;
  difficulty?: Difficulty;
  subject?: string;
  grade_level?: string;
  config?: GameConfig;
  thumbnail_url?: string;
  is_public?: boolean;
  is_active?: boolean;
}

/**
 * Submit Game Play Request
 */
export interface SubmitGamePlayRequest {
  game_id: string;
  player_name?: string; // Player's display name
  device_type?: DeviceType;
  time_taken_seconds: number;
  completed: boolean;
  completion_percentage: number;

  // Quiz-specific
  points_earned?: number;
  questions_correct?: number;
  questions_total?: number;
  max_streak?: number;
  hints_used?: number;
  lives_remaining?: number;
  answers?: Array<{
    questionIndex: number;
    questionId?: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    timeTaken: number;
    pointsEarned: number;
  }>;

  // Simulation-specific
  stars_earned?: number;
  interactions_count?: number;

  // Flashcard-specific
  cards_reviewed?: number;
  cards_mastered?: number;
  avg_confidence?: number;

  // Matching-specific
  pairs_matched?: number;
  pairs_total?: number;
  mistakes_count?: number;

  // Feedback
  feedback_rating?: number;
  feedback_text?: string;
  quit_reason?: QuitReason;
}

/**
 * Game Discovery Filters
 */
export interface GameFilters {
  game_type?: GameType;
  difficulty?: Difficulty;
  subject?: string;
  topic?: string;
  tags?: string[];
  min_plays?: number;
  is_featured?: boolean;
  sort_by?: 'recent' | 'popular' | 'rating' | 'plays';
  limit?: number;
  offset?: number;
}

/**
 * Leaderboard Query
 */
export interface LeaderboardQuery {
  game_id: string;
  time_range?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number;
  offset?: number;
}

/**
 * Leaderboard Entry (with user info)
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_email: string;
  best_score: number;
  best_time_seconds: number;
  best_accuracy: number;
  total_plays: number;
  perfect_score_count: number;
  percentile: number | null;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Game with Creator Info (for feeds)
 */
export interface GameWithCreator extends Game {
  creator_email: string;
  likes_count: number;
  tags: string[];
}

/**
 * User Stats (aggregated)
 */
export interface UserGameStats {
  user_id: string;
  games_created: number;
  total_plays_received: number;
  avg_completion_rate: number;
  featured_games_count: number;
  total_achievements: number;
  total_achievement_points: number;
}

/**
 * Game Play Summary (for analytics)
 */
export interface GamePlaySummary {
  total_plays: number;
  unique_players: number;
  avg_completion_rate: number;
  avg_score: number | null;
  avg_time_seconds: number | null;
  avg_stars: number | null;
  completion_by_day: Array<{ date: string; plays: number; completions: number }>;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isQuizConfig(config: GameConfig): config is QuizGameConfig {
  return 'questions' in config && Array.isArray(config.questions);
}

export function isDiagramConfig(config: GameConfig): config is InteractiveDiagramConfig {
  return 'base_image_url' in config && 'hotspots' in config;
}

export function isGeometryConfig(config: GameConfig): config is DraggableGeometryConfig {
  return 'shape_type' in config && 'initial_vertices' in config;
}

export function isParameterSliderConfig(config: GameConfig): config is ParameterSliderConfig {
  return 'equation' in config && 'parameters' in config;
}

export function isFlashcardConfig(config: GameConfig): config is FlashcardConfig {
  return 'cards' in config && Array.isArray(config.cards);
}

export function isMatchingConfig(config: GameConfig): config is MatchingConfig {
  return 'pairs' in config && Array.isArray(config.pairs);
}
