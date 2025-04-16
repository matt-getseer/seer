-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Create policies for profiles table
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow initial profile creation
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated; 