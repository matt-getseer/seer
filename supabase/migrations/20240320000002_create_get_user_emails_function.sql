-- Create a function to get user emails safely
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    email TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    requesting_user_id UUID;
BEGIN
    -- Get the requesting user's ID
    requesting_user_id := auth.uid();
    
    -- Check if the requesting user is an admin using direct query
    -- This bypasses RLS to avoid recursion
    IF NOT EXISTS (
        SELECT 1 
        FROM user_roles
        WHERE user_id = requesting_user_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Return emails for the requested user IDs
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$; 