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