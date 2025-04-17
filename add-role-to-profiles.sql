-- Create an enum type for user roles if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'owner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Set the first user as owner (you may want to adjust this based on your specific user)
UPDATE profiles
SET role = 'owner'
WHERE id IN (
    SELECT id
    FROM profiles
    ORDER BY created_at
    LIMIT 1
);

-- Add a policy to ensure users can only be created with 'user' role through normal signup
CREATE POLICY "Users can only be created with user role" ON profiles
    FOR INSERT
    WITH CHECK (
        role = 'user'
        OR
        auth.uid() IN (
            SELECT id FROM profiles
            WHERE role IN ('admin', 'owner')
        )
    ); 