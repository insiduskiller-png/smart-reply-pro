-- Create usage_limits table to track daily generation limits
-- This table tracks each generation attempt for free users

CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on user_id and created_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_created ON usage_limits(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_limits_created ON usage_limits(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own usage limits
CREATE POLICY "Users can view their own usage limits"
  ON usage_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert and manage usage limits
CREATE POLICY "Service role can manage usage limits"
  ON usage_limits FOR ALL
  USING (true)
  WITH CHECK (true);
