# Quick Migration Guide

## The Problem
The error "Could not find the table 'public.profiles' in the schema cache" means your database tables haven't been created yet.

## The Solution
Apply your SQL migrations to create the necessary tables in Supabase.

## Steps

### Option 1: Supabase Dashboard (Easiest)
1. Visit: https://supabase.com/dashboard/project/cfcwyvlljytujmgiugix/editor
2. For each migration file (in order):
   - Open `migrations/001_create_profiles_table.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"
   - Repeat for files 002 through 007

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref cfcwyvlljytujmgiugix

# Apply migrations
supabase db push
```

### Option 3: Manual SQL Execution
Run each migration file manually using psql or your database tool.

## Verify It Worked
After applying migrations, test by:
1. Restart your dev server: `npm run dev`
2. Try changing your username in the account page
3. Check the Supabase Table Editor to see the `profiles` table

## What These Migrations Create
- ✅ `profiles` table - stores user profiles
- ✅ `usage` table - tracks API usage
- ✅ `replies` table - stores generated replies
- ✅ `usage_limits` table - manages usage limits
- ✅ `conversations` table - stores conversation history
- ✅ Row Level Security (RLS) policies
- ✅ Automatic triggers for profile creation
