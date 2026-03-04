-- Create conversations table for dashboard conversation history
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'Professional',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for recent conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_created_at
  ON public.conversations(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT ON public.conversations TO authenticated;
