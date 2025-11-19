#!/bin/bash
# Get your super agent token from the browser localStorage or login
# For now, let's check if tables exist via service role

echo "Testing super agent setup..."

# Check if super_agent_profiles table exists
curl -X POST "https://nuexakcydimzdrntjshi.supabase.co/rest/v1/rpc/test" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM super_agent_profiles LIMIT 1"}' 2>&1 | head -5

