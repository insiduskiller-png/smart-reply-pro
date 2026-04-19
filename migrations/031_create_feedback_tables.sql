-- Migration 031: Feedback & Activity tracking
-- Adds feedback popup state + activity tracking to profiles,
-- and creates the user_feedback table for collected submissions.

-- ─── profiles: activity & feedback state columns ──────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_activity_at             TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS inactivity_email_sent_at     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS feedback_popup_dismissed_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS feedback_submitted_at        TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at
  ON profiles(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_profiles_inactivity_email_sent_at
  ON profiles(inactivity_email_sent_at);

-- ─── user_feedback: submitted feedback storage ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  source        TEXT NOT NULL DEFAULT 'popup',  -- 'popup' | 'inactive_email'
  feedback_text TEXT NOT NULL,
  submitted_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata      JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON user_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_submitted_at
  ON user_feedback(submitted_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
