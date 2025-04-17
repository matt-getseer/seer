-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role bypass" ON public.profiles;

-- Ensure service role has all permissions
GRANT ALL ON public.profiles TO service_role;

-- Force RLS and create bypass policy for service role
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant sequence permissions if any
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', seq_name);
    END LOOP;
END $$; 