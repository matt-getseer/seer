-- Drop existing participant policies
DROP POLICY IF EXISTS "participants_delete_policy" ON participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON participants;
DROP POLICY IF EXISTS "participants_public_read_by_token" ON participants;
DROP POLICY IF EXISTS "participants_select_policy" ON participants;
DROP POLICY IF EXISTS "participants_update_policy" ON participants;

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create aligned policies following the pattern from survey_questions and survey_responses

-- SELECT policies
CREATE POLICY "Workspace members can view participants"
ON participants FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = participants.survey_id
        AND s.workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- Keep token-based SELECT for public access
CREATE POLICY "participants_public_read_by_token"
ON participants FOR SELECT
TO public
USING (
    participation_token = COALESCE(
        NULLIF(regexp_replace(current_setting('request.query.participation_token'::text, true), '^eq\.'::text, ''::text), ''::text),
        participation_token
    )
);

-- INSERT policies
CREATE POLICY "Workspace members can create participants"
ON participants FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = survey_id
        AND s.workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- UPDATE policy
CREATE POLICY "Workspace members can update participants"
ON participants FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = participants.survey_id
        AND s.workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- DELETE policy
CREATE POLICY "Workspace members can delete participants"
ON participants FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = participants.survey_id
        AND s.workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- Grant necessary permissions
GRANT ALL ON participants TO authenticated; 