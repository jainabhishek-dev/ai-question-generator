-- ============================================
-- GAME SYSTEM DATABASE SCHEMA
-- AI Question Generator → Game-Based Learning Platform
-- ============================================
-- This schema supports:
-- 1. Quiz Games (assessment with points/leaderboards)
-- 2. Interactive Simulations (learning with stars/badges)
-- 3. Flashcard Practice (mastery tracking)
-- 4. Matching Games (concept reinforcement)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- 1. GAMES TABLE
-- Core game definitions and configurations
-- ============================================

CREATE TABLE IF NOT EXISTS games (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Game metadata
    title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
    description TEXT CHECK (char_length(description) <= 1000),
    topic TEXT NOT NULL CHECK (char_length(topic) >= 2 AND char_length(topic) <= 100),
    
    -- Game type
    game_type TEXT NOT NULL CHECK (game_type IN (
        'quiz',                    -- Multiple choice quiz with timer/points
        'interactive_diagram',     -- Click/explore labeled diagrams
        'draggable_geometry',      -- Manipulate shapes, see properties
        'parameter_slider',        -- Adjust parameters, observe effects
        'flashcard',              -- Spaced repetition practice
        'matching'                -- Match concepts to definitions
    )),
    
    -- Difficulty & subject
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    subject TEXT CHECK (char_length(subject) <= 50),
    grade_level TEXT, -- e.g., "6-8", "9-12", "college"
    
    -- Game configuration (AI-generated JSON)
    config JSONB NOT NULL,
    -- Structure varies by game_type:
    -- quiz: {questions: [], settings: {time_limit, lives, hints_enabled}}
    -- interactive_diagram: {base_image_url, hotspots: [{x, y, label, description}]}
    -- draggable_geometry: {shape_type, initial_vertices: [], constraints: []}
    -- parameter_slider: {equation, parameters: [{name, min, max, default}]}
    -- flashcard: {cards: [{front, back, difficulty}]}
    -- matching: {pairs: [{concept, definition}]}
    
    -- Visual assets
    thumbnail_url TEXT, -- Preview image
    static_images JSONB, -- Array of image URLs used in game
    
    -- Ownership & sharing
    user_id UUID NOT NULL, -- Creator
    is_public BOOLEAN DEFAULT TRUE,
    share_code TEXT UNIQUE NOT NULL, -- Short code for sharing (8 chars)
    allow_anonymous_play BOOLEAN DEFAULT TRUE,
    
    -- Game statistics
    total_plays INTEGER DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    avg_completion_rate DECIMAL(5,2), -- Percentage (0-100)
    
    -- For quiz games
    avg_score INTEGER,
    avg_time_seconds INTEGER,
    
    -- For simulations
    avg_stars DECIMAL(3,2), -- Average stars earned (0-3.00)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN (
        'pending',    -- Awaiting moderation
        'approved',   -- Ready to play
        'rejected',   -- Violates policies
        'flagged'     -- Reported by users
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_played_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraint
    CONSTRAINT fk_games_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 2. GAME_PLAYS TABLE
-- Individual game play sessions and results
-- ============================================

CREATE TABLE IF NOT EXISTS game_plays (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Game reference
    game_id UUID NOT NULL,
    user_id UUID, -- NULL for anonymous players
    
    -- Session tracking
    session_id UUID NOT NULL DEFAULT uuid_generate_v4(), -- For analytics
    device_type TEXT CHECK (device_type IN ('web', 'android', 'ios')),
    
    -- Universal metrics (all game types)
    time_started TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_ended TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER, -- Calculated: time_ended - time_started
    completed BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Quiz-specific metrics
    points_earned INTEGER, -- NULL for non-quiz games
    questions_correct INTEGER,
    questions_total INTEGER,
    max_streak INTEGER,
    hints_used INTEGER,
    lives_remaining INTEGER,
    
    -- Simulation-specific metrics
    stars_earned INTEGER CHECK (stars_earned >= 0 AND stars_earned <= 3), -- 0-3 stars
    interactions_count INTEGER, -- Number of interactions (clicks, drags, slider changes)
    
    -- Flashcard-specific metrics
    cards_reviewed INTEGER,
    cards_mastered INTEGER, -- Cards that reached mastery threshold
    avg_confidence DECIMAL(3,2), -- Average user confidence rating (1-5)
    
    -- Matching-specific metrics
    pairs_matched INTEGER,
    pairs_total INTEGER,
    mistakes_count INTEGER,
    
    -- Analytics
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_text TEXT CHECK (char_length(feedback_text) <= 500),
    quit_reason TEXT CHECK (quit_reason IN ('completed', 'too_hard', 'too_easy', 'boring', 'technical_issue', 'interrupted')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_game_plays_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_game_plays_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. GAME_LEADERBOARDS TABLE
-- Best scores per user per game (quiz only)
-- ============================================

CREATE TABLE IF NOT EXISTS game_leaderboards (
    -- Composite primary key
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Best performance
    best_score INTEGER NOT NULL,
    best_time_seconds INTEGER NOT NULL,
    best_accuracy DECIMAL(5,2), -- Percentage correct
    
    -- Overall statistics
    total_plays INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    avg_score DECIMAL(8,2),
    
    -- Achievements
    perfect_score_count INTEGER DEFAULT 0, -- Number of 100% games
    
    -- Rank tracking (updated by trigger)
    global_rank INTEGER, -- Rank among all players for this game
    percentile DECIMAL(5,2), -- Top X% of players
    
    -- Timestamps
    first_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    best_score_achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (game_id, user_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_game_leaderboards_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_game_leaderboards_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. USER_ACHIEVEMENTS TABLE
-- Badges, milestones, and accomplishments
-- ============================================

CREATE TABLE IF NOT EXISTS user_achievements (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id UUID NOT NULL,
    
    -- Achievement details
    achievement_type TEXT NOT NULL CHECK (achievement_type IN (
        'badge',           -- Special accomplishment badge
        'milestone',       -- Progress milestone
        'streak',          -- Consecutive days/games
        'mastery',         -- Subject mastery
        'creator'          -- Game creation achievements
    )),
    
    achievement_id TEXT NOT NULL, -- e.g., 'first_game', 'explorer_badge', '10_day_streak'
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    
    -- Achievement metadata
    game_id UUID, -- Associated game (if applicable)
    points_awarded INTEGER DEFAULT 0,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    
    -- Display assets
    icon_url TEXT,
    badge_color TEXT, -- Hex color for badge display
    
    -- Timestamps
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE (user_id, achievement_id), -- Can't earn same achievement twice
    
    -- Foreign key constraints
    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE SET NULL
);

-- ============================================
-- 5. FLASHCARD_PROGRESS TABLE
-- Spaced repetition tracking for flashcard games
-- ============================================

CREATE TABLE IF NOT EXISTS flashcard_progress (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    user_id UUID NOT NULL,
    game_id UUID NOT NULL,
    card_index INTEGER NOT NULL, -- Index in game.config.cards array
    
    -- Spaced repetition algorithm
    easiness_factor DECIMAL(4,2) DEFAULT 2.50, -- SM-2 algorithm (1.3 - 2.5)
    interval_days INTEGER DEFAULT 1, -- Days until next review
    repetitions INTEGER DEFAULT 0, -- Number of successful reviews
    
    -- Mastery tracking
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
    confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
    
    -- Review history
    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    last_review_result TEXT CHECK (last_review_result IN ('correct', 'incorrect', 'partially_correct')),
    
    -- Timestamps
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique constraint
    UNIQUE (user_id, game_id, card_index),
    
    -- Foreign key constraints
    CONSTRAINT fk_flashcard_progress_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_flashcard_progress_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE
);

-- ============================================
-- 6. GAME_TAGS TABLE
-- Taxonomy and categorization
-- ============================================

CREATE TABLE IF NOT EXISTS game_tags (
    -- Composite primary key
    game_id UUID NOT NULL,
    tag TEXT NOT NULL CHECK (char_length(tag) >= 2 AND char_length(tag) <= 50),
    
    -- Tag metadata
    tag_type TEXT DEFAULT 'topic' CHECK (tag_type IN (
        'topic',      -- Subject matter (e.g., 'geometry', 'biology')
        'skill',      -- Skill developed (e.g., 'problem_solving', 'memorization')
        'curriculum', -- Curriculum standard (e.g., 'NCERT_CLASS_10')
        'feature'     -- Game feature (e.g., 'multiplayer', 'timed')
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (game_id, tag),
    
    -- Foreign key constraint
    CONSTRAINT fk_game_tags_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE
);

-- ============================================
-- 7. GAME_COMMENTS TABLE
-- User feedback and discussions
-- ============================================

CREATE TABLE IF NOT EXISTS game_comments (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_comment_id UUID, -- For nested replies
    
    -- Comment content
    comment_text TEXT NOT NULL CHECK (char_length(comment_text) >= 1 AND char_length(comment_text) <= 1000),
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_game_comments_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_game_comments_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_game_comments_parent FOREIGN KEY (parent_comment_id) 
        REFERENCES game_comments(id) ON DELETE CASCADE
);

-- ============================================
-- 8. GAME_LIKES TABLE
-- User likes/favorites
-- ============================================

CREATE TABLE IF NOT EXISTS game_likes (
    -- Composite primary key
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (game_id, user_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_game_likes_game FOREIGN KEY (game_id) 
        REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_game_likes_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================

-- Games table indexes
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);
CREATE INDEX IF NOT EXISTS idx_games_difficulty ON games(difficulty);
CREATE INDEX IF NOT EXISTS idx_games_topic ON games USING gin(topic gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_games_share_code ON games(share_code);
CREATE INDEX IF NOT EXISTS idx_games_is_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_games_is_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_is_featured ON games(is_featured);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_total_plays ON games(total_plays DESC);

-- Game plays table indexes
CREATE INDEX IF NOT EXISTS idx_game_plays_game_id ON game_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_user_id ON game_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_session_id ON game_plays(session_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_completed ON game_plays(completed);
CREATE INDEX IF NOT EXISTS idx_game_plays_created_at ON game_plays(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_game_plays_game_user ON game_plays(game_id, user_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_user_completed ON game_plays(user_id, completed);

-- Leaderboards indexes
CREATE INDEX IF NOT EXISTS idx_game_leaderboards_game_score ON game_leaderboards(game_id, best_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_leaderboards_user ON game_leaderboards(user_id);
CREATE INDEX IF NOT EXISTS idx_game_leaderboards_global_rank ON game_leaderboards(game_id, global_rank ASC);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- Flashcard progress indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user_game ON flashcard_progress(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(next_review_at ASC);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_game_tags_tag ON game_tags(tag);
CREATE INDEX IF NOT EXISTS idx_game_tags_type ON game_tags(tag_type);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_game_comments_game_id ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_user_id ON game_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_parent_id ON game_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_created_at ON game_comments(created_at DESC);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_game_likes_user_id ON game_likes(user_id);

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_likes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GAMES TABLE POLICIES
-- ============================================

-- Anyone can view public active games
CREATE POLICY "Anyone can view public games" ON games
    FOR SELECT USING (
        is_public = TRUE 
        AND is_active = TRUE 
        AND moderation_status = 'approved'
    );

-- Users can view their own games (even private/inactive)
CREATE POLICY "Users can view own games" ON games
    FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games" ON games
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- Users can update their own games
CREATE POLICY "Users can update own games" ON games
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own games
CREATE POLICY "Users can delete own games" ON games
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- GAME_PLAYS TABLE POLICIES
-- ============================================

-- Anyone can create game plays (including anonymous)
CREATE POLICY "Anyone can create game plays" ON game_plays
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own game plays
CREATE POLICY "Users can view own game plays" ON game_plays
    FOR SELECT USING (user_id = auth.uid());

-- Game creators can view plays of their games
CREATE POLICY "Creators can view plays of their games" ON game_plays
    FOR SELECT USING (
        game_id IN (
            SELECT id FROM games WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- GAME_LEADERBOARDS TABLE POLICIES
-- ============================================

-- Anyone can view leaderboards for public games
CREATE POLICY "Anyone can view public leaderboards" ON game_leaderboards
    FOR SELECT USING (
        game_id IN (
            SELECT id FROM games WHERE is_public = TRUE AND is_active = TRUE
        )
    );

-- System can insert/update leaderboard entries (handled by triggers)
CREATE POLICY "System can manage leaderboards" ON game_leaderboards
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================
-- USER_ACHIEVEMENTS TABLE POLICIES
-- ============================================

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (user_id = auth.uid());

-- System can create achievements (handled by triggers)
CREATE POLICY "System can create achievements" ON user_achievements
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- FLASHCARD_PROGRESS TABLE POLICIES
-- ============================================

-- Users can view their own progress
CREATE POLICY "Users can view own flashcard progress" ON flashcard_progress
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own progress entries
CREATE POLICY "Users can create own flashcard progress" ON flashcard_progress
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can update own flashcard progress" ON flashcard_progress
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- GAME_TAGS TABLE POLICIES
-- ============================================

-- Anyone can view tags for public games
CREATE POLICY "Anyone can view tags for public games" ON game_tags
    FOR SELECT USING (
        game_id IN (
            SELECT id FROM games WHERE is_public = TRUE
        )
    );

-- Users can manage tags for their own games
CREATE POLICY "Users can manage tags for own games" ON game_tags
    FOR ALL USING (
        game_id IN (
            SELECT id FROM games WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- GAME_COMMENTS TABLE POLICIES
-- ============================================

-- Anyone can view comments on public games
CREATE POLICY "Anyone can view comments on public games" ON game_comments
    FOR SELECT USING (
        game_id IN (
            SELECT id FROM games WHERE is_public = TRUE
        )
        AND is_hidden = FALSE
    );

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON game_comments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON game_comments
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON game_comments
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- GAME_LIKES TABLE POLICIES
-- ============================================

-- Anyone can view like counts (aggregated)
CREATE POLICY "Anyone can view likes for public games" ON game_likes
    FOR SELECT USING (
        game_id IN (
            SELECT id FROM games WHERE is_public = TRUE
        )
    );

-- Authenticated users can like games
CREATE POLICY "Authenticated users can like games" ON game_likes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- Users can unlike games
CREATE POLICY "Users can unlike games" ON game_likes
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 11. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update game statistics after play
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update game statistics
    UPDATE games
    SET 
        total_plays = total_plays + 1,
        unique_players = (
            SELECT COUNT(DISTINCT user_id) 
            FROM game_plays 
            WHERE game_id = NEW.game_id AND user_id IS NOT NULL
        ),
        avg_completion_rate = (
            SELECT AVG(completion_percentage)
            FROM game_plays
            WHERE game_id = NEW.game_id
        ),
        avg_score = (
            SELECT AVG(points_earned)
            FROM game_plays
            WHERE game_id = NEW.game_id AND points_earned IS NOT NULL
        ),
        avg_time_seconds = (
            SELECT AVG(time_taken_seconds)
            FROM game_plays
            WHERE game_id = NEW.game_id AND time_taken_seconds IS NOT NULL
        ),
        avg_stars = (
            SELECT AVG(stars_earned)
            FROM game_plays
            WHERE game_id = NEW.game_id AND stars_earned IS NOT NULL
        ),
        last_played_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.game_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update game stats after each play
CREATE TRIGGER trigger_update_game_stats
AFTER INSERT ON game_plays
FOR EACH ROW
EXECUTE FUNCTION update_game_stats();

-- Function to update or insert leaderboard entry (quiz games only)
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for quiz games with authenticated users
    IF NEW.user_id IS NOT NULL AND NEW.points_earned IS NOT NULL THEN
        INSERT INTO game_leaderboards (
            game_id,
            user_id,
            best_score,
            best_time_seconds,
            best_accuracy,
            total_plays,
            total_points,
            avg_score,
            perfect_score_count,
            last_played_at,
            best_score_achieved_at
        ) VALUES (
            NEW.game_id,
            NEW.user_id,
            NEW.points_earned,
            COALESCE(NEW.time_taken_seconds, 999999),
            CASE 
                WHEN NEW.questions_total > 0 
                THEN (NEW.questions_correct::DECIMAL / NEW.questions_total * 100)
                ELSE 0
            END,
            1,
            NEW.points_earned,
            NEW.points_earned,
            CASE WHEN NEW.questions_correct = NEW.questions_total THEN 1 ELSE 0 END,
            NEW.created_at,
            NEW.created_at
        )
        ON CONFLICT (game_id, user_id) DO UPDATE SET
            best_score = GREATEST(game_leaderboards.best_score, NEW.points_earned),
            best_time_seconds = CASE 
                WHEN NEW.points_earned > game_leaderboards.best_score 
                THEN COALESCE(NEW.time_taken_seconds, game_leaderboards.best_time_seconds)
                WHEN NEW.points_earned = game_leaderboards.best_score
                THEN LEAST(game_leaderboards.best_time_seconds, COALESCE(NEW.time_taken_seconds, 999999))
                ELSE game_leaderboards.best_time_seconds
            END,
            best_accuracy = CASE
                WHEN NEW.questions_total > 0
                THEN GREATEST(
                    game_leaderboards.best_accuracy,
                    (NEW.questions_correct::DECIMAL / NEW.questions_total * 100)
                )
                ELSE game_leaderboards.best_accuracy
            END,
            total_plays = game_leaderboards.total_plays + 1,
            total_points = game_leaderboards.total_points + NEW.points_earned,
            avg_score = (game_leaderboards.total_points + NEW.points_earned) / (game_leaderboards.total_plays + 1),
            perfect_score_count = game_leaderboards.perfect_score_count + 
                CASE WHEN NEW.questions_correct = NEW.questions_total THEN 1 ELSE 0 END,
            last_played_at = NEW.created_at,
            best_score_achieved_at = CASE
                WHEN NEW.points_earned > game_leaderboards.best_score
                THEN NEW.created_at
                ELSE game_leaderboards.best_score_achieved_at
            END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update leaderboard after quiz play
CREATE TRIGGER trigger_update_leaderboard
AFTER INSERT ON game_plays
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard();

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to set share code before insert
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_code IS NULL OR NEW.share_code = '' THEN
        NEW.share_code := generate_share_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate share code
CREATE TRIGGER trigger_set_share_code
BEFORE INSERT ON games
FOR EACH ROW
EXECUTE FUNCTION set_share_code();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER trigger_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_flashcard_progress_updated_at
BEFORE UPDATE ON flashcard_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. HELPER VIEWS
-- ============================================

-- View for public game discovery
CREATE OR REPLACE VIEW public_games_feed AS
SELECT 
    g.id,
    g.title,
    g.description,
    g.topic,
    g.game_type,
    g.difficulty,
    g.subject,
    g.thumbnail_url,
    g.share_code,
    g.total_plays,
    g.avg_score,
    g.avg_stars,
    g.created_at,
    u.email as creator_email,
    COUNT(gl.user_id) as likes_count,
    ARRAY_AGG(DISTINCT gt.tag) FILTER (WHERE gt.tag IS NOT NULL) as tags
FROM games g
LEFT JOIN auth.users u ON g.user_id = u.id
LEFT JOIN game_likes gl ON g.id = gl.game_id
LEFT JOIN game_tags gt ON g.id = gt.game_id
WHERE g.is_public = TRUE 
  AND g.is_active = TRUE 
  AND g.moderation_status = 'approved'
GROUP BY g.id, u.email;

-- View for user's game statistics
CREATE OR REPLACE VIEW user_game_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT id) as games_created,
    SUM(total_plays) as total_plays_received,
    AVG(avg_completion_rate) as avg_completion_rate,
    COUNT(*) FILTER (WHERE is_featured = TRUE) as featured_games_count
FROM games
WHERE is_active = TRUE
GROUP BY user_id;

-- ============================================
-- END OF GAME SYSTEM SCHEMA
-- ============================================
