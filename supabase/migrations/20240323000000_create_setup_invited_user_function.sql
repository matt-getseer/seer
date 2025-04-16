-- Create a function to setup an invited user with their profile and role
CREATE OR REPLACE FUNCTION setup_invited_user(user_id UUID, user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use a transaction to ensure all operations succeed or fail together
  BEGIN
    -- Create the profile
    INSERT INTO profiles (
      id,
      email,
      invited_at,
      status,
      updated_at,
      full_name,
      username,
      avatar_url
    ) VALUES (
      user_id,
      user_email,
      NOW(),
      'invited',
      NOW(),
      NULL,
      NULL,
      NULL
    );

    -- Add the user role
    INSERT INTO user_roles (
      user_id,
      role
    ) VALUES (
      user_id,
      'user'
    );

    -- If any of the above fails, the transaction will be rolled back
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to setup user: %', SQLERRM;
  END;
END;
$$; 