-- First, drop everything to start clean
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = $1 
    AND role = 'admin'
  );
$$;

-- Create a function to get user emails (only accessible by admins)
CREATE OR REPLACE FUNCTION get_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. User is not an admin.';
  END IF;

  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au;
END;
$$;

-- Create the user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create a single policy for viewing roles
CREATE POLICY "View roles policy"
ON user_roles
FOR SELECT
USING (
  -- Users can view their own roles OR admins can view all roles
  auth.uid() = user_id OR 
  is_admin(auth.uid())
);

-- Create a policy for managing roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Manage roles policy"
ON user_roles
FOR ALL
USING (
  -- Only admins can manage roles
  is_admin(auth.uid())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role); 