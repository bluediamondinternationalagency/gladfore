# Apply Waitlist Migration to Supabase

## Steps to Apply the Migration:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi
   - Navigate to: SQL Editor

2. **Copy and Execute the Migration**
   - Copy the entire contents of: `supabase/migrations/20251121000000_create_waitlist.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify the Table Was Created**
   - Navigate to: Table Editor
   - Look for the `waitlist` table
   - Should see all columns: user_type, full_name, email, phone, nin, state, lga, etc.

## Alternative: Use the SQL Below

```sql
-- Copy the SQL from the migration file shown above
```

## After Migration is Applied:

✅ The waitlist feature will be fully functional:
- Landing page "Join Waitlist" buttons will work
- Forms will submit to the `waitlist` table
- Admin can view/manage waitlist from Admin Dashboard → Waitlist tab

## Troubleshooting:

If you see "404 Not Found" error when submitting waitlist:
- The migration hasn't been applied yet
- Follow steps above to apply it

If you see "Permission denied" error:
- The RLS policies should allow anonymous inserts
- Check that the policies were created correctly
