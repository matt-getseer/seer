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