DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'replies'
  ) THEN
    ALTER TABLE public.replies
    ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_replies_favorite
      ON public.replies(user_id, favorite)
      WHERE favorite = true;
  END IF;
END;
$$;
