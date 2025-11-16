#!/bin/bash

# Deploy all Supabase Edge Functions
# Make sure you have SUPABASE_ACCESS_TOKEN set or run: supabase login

echo "🚀 Deploying Supabase Edge Functions..."

# Check if logged in
if ! supabase projects list &>/dev/null; then
  echo "❌ Not logged in to Supabase. Please run: supabase login"
  echo "Or set SUPABASE_ACCESS_TOKEN environment variable"
  exit 1
fi

# Deploy each function
FUNCTIONS=(
  "admin-agents"
  "admin-create-user"
  "admin-farmers"
  "admin-kyc-pending"
  "admin-orders"
  "admin-payments"
  "admin-stats"
)

echo ""
echo "📦 Found ${#FUNCTIONS[@]} functions to deploy"
echo ""

for func in "${FUNCTIONS[@]}"; do
  echo "⏳ Deploying $func..."
  if supabase functions deploy "$func" --project-ref nuexakcydimzdrntjshi --no-verify-jwt; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
    exit 1
  fi
  echo ""
done

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "Function URLs:"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-agents"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-create-user"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-farmers"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-kyc-pending"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-orders"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-payments"
echo "https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-stats"
echo ""
echo "⚠️  Don't forget to set environment secrets:"
echo "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here"
echo ""
