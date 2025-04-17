-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'invited')),
    full_name TEXT,
    username TEXT,
    avatar_url TEXT
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS profiles_status_idx ON profiles(status);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Allow service role to bypass RLS
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to bypass RLS
CREATE POLICY "Service role bypass"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 