-- Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id; 