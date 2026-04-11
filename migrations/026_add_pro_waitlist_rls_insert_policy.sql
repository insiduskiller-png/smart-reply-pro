ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pro_waitlist'
      AND policyname = 'allow_anon_insert_pro_waitlist'
  ) THEN
    CREATE POLICY allow_anon_insert_pro_waitlist
      ON public.pro_waitlist
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
