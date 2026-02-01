-- Live Quiz Multiplayer Database Schema
-- Tables for real-time multiplayer quiz sessions

-- ============================================================================
-- Table: live_sessions
-- Stores information about live quiz sessions hosted by authenticated users
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
  current_question_index INTEGER DEFAULT 0,
  participant_limit INTEGER NOT NULL DEFAULT 50,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Summary statistics (populated when completed)
  total_participants INTEGER,
  average_score DECIMAL(10, 2),
  completion_rate DECIMAL(5, 2),
  session_duration_seconds INTEGER,
  
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'completed')),
  CONSTRAINT valid_participant_limit CHECK (participant_limit >= 1 AND participant_limit <= 200),
  CONSTRAINT valid_question_index CHECK (current_question_index >= 0)
);

-- Indexes for live_sessions
CREATE INDEX IF NOT EXISTS idx_live_sessions_pin ON live_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_updated ON live_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_game ON live_sessions(game_id);

-- ============================================================================
-- Table: live_participants
-- Stores information about participants in live quiz sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  final_rank INTEGER,
  
  CONSTRAINT unique_nickname_per_session UNIQUE(session_id, nickname),
  CONSTRAINT valid_score CHECK (score >= 0),
  CONSTRAINT valid_correct_answers CHECK (correct_answers >= 0),
  CONSTRAINT valid_streak CHECK (current_streak >= 0 AND max_streak >= 0),
  CONSTRAINT valid_nickname CHECK (char_length(nickname) >= 3 AND char_length(nickname) <= 50)
);

-- Indexes for live_participants
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_score ON live_participants(session_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_live_participants_active ON live_participants(session_id, is_active);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

-- live_sessions policies
-- Allow authenticated users to create sessions for their own games
CREATE POLICY "Users can create live sessions for their games"
  ON live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_id 
      AND games.user_id = auth.uid()
    )
  );

-- Allow authenticated users to view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON live_sessions
  FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

-- Allow anyone to view sessions by PIN (for joining)
CREATE POLICY "Anyone can view sessions by PIN"
  ON live_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow hosts to update their own sessions
CREATE POLICY "Hosts can update their own sessions"
  ON live_sessions
  FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Allow hosts to delete their own sessions
CREATE POLICY "Hosts can delete their own sessions"
  ON live_sessions
  FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- live_participants policies
-- Allow anyone to insert participants (for joining)
CREATE POLICY "Anyone can join as participant"
  ON live_participants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to view participants in a session
CREATE POLICY "Anyone can view participants"
  ON live_participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow participants to update their own data
CREATE POLICY "Participants can update their own data"
  ON live_participants
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow hosts to update participants in their sessions
CREATE POLICY "Hosts can update participants in their sessions"
  ON live_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = session_id
      AND live_sessions.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = session_id
      AND live_sessions.host_id = auth.uid()
    )
  );

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_live_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_live_sessions_updated_at();

-- ============================================================================
-- Function: Cleanup inactive sessions (call via cron or periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_inactive_live_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions that haven't been updated in 30 minutes
  DELETE FROM live_sessions
  WHERE updated_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE live_sessions IS 'Stores live quiz session metadata and state';
COMMENT ON TABLE live_participants IS 'Stores participant data for live quiz sessions';
COMMENT ON COLUMN live_sessions.pin IS 'Unique 6-digit PIN for joining the session';
COMMENT ON COLUMN live_sessions.status IS 'Session status: waiting, active, or completed';
COMMENT ON COLUMN live_participants.answers IS 'JSONB array of participant answers with metadata';
COMMENT ON FUNCTION cleanup_inactive_live_sessions() IS 'Removes sessions inactive for 30+ minutes';
