-- Migration: AI Engine Upgrade
-- Adds behavioral learning loop infrastructure, message intelligence tracking,
-- and user preference state to power adaptive reply generation.

-- 1) Add last_active_at to reply_profiles so touchReplyProfileActivity actually works
ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- 2) Extend profile_messages with generation_id linkage and selection tracking
--    generation_id: links a message to the specific generation batch it belongs to
--    selected_option_index: if role = user_reply, which option (0/1/2) the user picked
ALTER TABLE public.profile_messages
  ADD COLUMN IF NOT EXISTS generation_id UUID,
  ADD COLUMN IF NOT EXISTS selected_option_index SMALLINT;

-- 3) Create user_preference_state table
--    One row per user — stores aggregated behavioral signals from selections
CREATE TABLE IF NOT EXISTS public.user_preference_state (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tone selection frequency: { "Direct": 5, "Neutral": 3, "Friendly": 1 }
  preferred_tones    JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Variant selection frequency: { "Assertive": 4, "Calm": 2, "Strategic": 1 }
  preferred_variants JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Option index selection counts: { "0": 3, "1": 7, "2": 2 }
  option_index_counts JSONB NOT NULL DEFAULT '{"0": 0, "1": 0, "2": 0}'::jsonb,

  -- Per-context-category tone preferences: { "work": { "Direct": 3 }, "personal": { "Calm": 5 } }
  context_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Total tracked selections
  total_selections INTEGER NOT NULL DEFAULT 0,

  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT user_preference_state_user_id_unique UNIQUE (user_id)
);

-- RLS for user_preference_state
ALTER TABLE public.user_preference_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preference state"
  ON public.user_preference_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages preference state"
  ON public.user_preference_state FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4) Index for preference state lookups
CREATE INDEX IF NOT EXISTS idx_user_preference_state_user_id
  ON public.user_preference_state (user_id);

-- 5) Index for generation_id on profile_messages
CREATE INDEX IF NOT EXISTS idx_profile_messages_generation_id
  ON public.profile_messages (generation_id)
  WHERE generation_id IS NOT NULL;
