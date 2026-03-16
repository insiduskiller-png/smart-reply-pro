-- Add structured conversation style memory fields to reply profiles

ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS tone_pattern TEXT,
  ADD COLUMN IF NOT EXISTS sentence_length TEXT,
  ADD COLUMN IF NOT EXISTS directness_level TEXT,
  ADD COLUMN IF NOT EXISTS emoji_usage TEXT,
  ADD COLUMN IF NOT EXISTS formality_level TEXT,
  ADD COLUMN IF NOT EXISTS conflict_style TEXT;
