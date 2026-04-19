-- Migration 033: Learned Style State
-- Adds per-user cross-profile adaptive style trait memory.
--
-- Purpose:
--   reply_profiles.style_memory is per-contact (how user writes with one person).
--   user_learned_style is per-user (how user consistently writes across all contacts).
--
--   Every time generateStyleSummary runs for any profile, the resulting traits are
--   averaged into this table. Over time, consistent style patterns build higher
--   confidence scores. Generation uses these as a fallback when profile style_memory
--   is absent, and as a supplementary signal when it exists.
--
-- Schema design: single JSONB column for traits — cleaner than 16 individual
-- columns (8 scores + 8 confidences), extensible, consistent with existing
-- intelligence_model pattern in reply_profiles.
--
-- Each trait entry: { "score": 0.0–1.0, "confidence": 0.0–1.0, "is_default": bool }
--   score:       0 = very low, 0.5 = neutral, 1 = very high
--   confidence:  0 = no data (default), 0.5 = one observation, 1 = well-established
--   is_default:  true = never been seeded from real data
--
-- Traits tracked:
--   directness, warmth, brevity, assertiveness,
--   politeness, boundary_strength, professionalism, humor

CREATE TABLE IF NOT EXISTS public.user_learned_style (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Compact trait store — see header for schema
  traits     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Number of style-memory snapshots that have contributed to this state.
  -- Confidence grows with each new observation. Useful for developer inspection.
  observation_count INTEGER NOT NULL DEFAULT 0,

  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT user_learned_style_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_learned_style ENABLE ROW LEVEL SECURITY;

-- Users can read their own style (needed for any future client-side inspection)
CREATE POLICY "Users can read own learned style"
  ON public.user_learned_style FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles all writes (generation pipeline runs server-side)
CREATE POLICY "Service role manages learned style"
  ON public.user_learned_style FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_learned_style_user_id
  ON public.user_learned_style (user_id);

-- Developer inspection query:
-- SELECT user_id, observation_count, last_updated_at, traits FROM public.user_learned_style;
-- SELECT user_id, traits->>'directness' AS directness, traits->>'brevity' AS brevity FROM public.user_learned_style;
