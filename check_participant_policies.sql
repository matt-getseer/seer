-- Show all policies on the participants table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'participants';

-- Show RLS status
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'participants';

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants';

-- Show functions related to participants
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%participant%'; 