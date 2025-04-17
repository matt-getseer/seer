-- Update existing surveys to have the correct workspace_id based on their creator's workspace
UPDATE surveys
SET workspace_id = profiles.workspace_id
FROM profiles
WHERE surveys.user_id = profiles.id
AND surveys.workspace_id IS NULL;

-- Add a trigger to ensure new surveys always have a workspace_id
CREATE OR REPLACE FUNCTION public.set_survey_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the workspace_id from the creator's profile
    SELECT workspace_id INTO NEW.workspace_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create survey: User must be associated with a workspace';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS ensure_survey_workspace_id ON surveys;

-- Create the trigger
CREATE TRIGGER ensure_survey_workspace_id
    BEFORE INSERT ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION public.set_survey_workspace_id(); 