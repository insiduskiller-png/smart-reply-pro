-- Add favorite column to replies table
ALTER TABLE public.replies 
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Create index for faster favorites queries
CREATE INDEX IF NOT EXISTS idx_replies_favorite ON public.replies(user_id, favorite)
WHERE favorite = true;
