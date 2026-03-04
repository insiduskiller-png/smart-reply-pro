#!/bin/bash

# Script to apply SQL migrations to Supabase
# This will execute all migration files in order

echo "🚀 Applying migrations to Supabase..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if required env vars are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
    exit 1
fi

# Function to execute a SQL file
execute_sql_file() {
    local file=$1
    local filename=$(basename "$file")
    
    echo "📝 Executing: $filename"
    
    # Read the SQL file content
    local sql_content=$(cat "$file")
    
    # Execute via Supabase REST API
    local response=$(curl -s -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: $filename"
    else
        echo "❌ Failed: $filename"
        echo "Response: $response"
    fi
    echo ""
}

# Apply migrations in order
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        execute_sql_file "$migration"
    fi
done

echo "✨ Migration process completed!"
echo ""
echo "Note: If you see errors, you may need to run these migrations"
echo "directly in the Supabase SQL Editor at:"
echo "${NEXT_PUBLIC_SUPABASE_URL/https:\/\//https://supabase.com/dashboard/project/}/editor"
