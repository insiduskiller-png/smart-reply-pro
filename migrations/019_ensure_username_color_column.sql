ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_color TEXT DEFAULT '#ffffff';

ALTER TABLE public.profiles
ALTER COLUMN username_color SET DEFAULT '#ffffff';

UPDATE public.profiles
SET username_color = '#ffffff'
WHERE username_color IS NULL;
