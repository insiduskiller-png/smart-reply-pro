ALTER TABLE public.replies
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_replies_favorite
  ON public.replies(user_id, favorite)
  WHERE favorite = true;
