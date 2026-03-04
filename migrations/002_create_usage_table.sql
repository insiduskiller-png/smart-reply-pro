-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage(date);

-- Enable RLS
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage
CREATE POLICY "Users can read their own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own usage
CREATE POLICY "Users can insert their own usage"
  ON usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own usage
CREATE POLICY "Users can update their own usage"
  ON usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
