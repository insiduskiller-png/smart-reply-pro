-- Create replies table for storing generated replies per user
CREATE TABLE IF NOT EXISTS public.replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  context TEXT,
  tone TEXT NOT NULL DEFAULT 'Professional',
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_replies_user_id_created ON public.replies(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- Create policies for user privacy
CREATE POLICY "Users can view their own replies"
  ON public.replies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own replies"
  ON public.replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.replies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.replies TO authenticated;
