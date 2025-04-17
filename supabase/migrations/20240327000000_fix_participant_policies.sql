-- Drop all existing participant policies
DROP POLICY IF EXISTS "Workspace members can view participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can add participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can create participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can update participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can delete participants" ON participants;
DROP POLICY IF EXISTS "Users can add participants to their surveys" ON participants;
DROP POLICY IF EXISTS "Users can view participants of their surveys" ON participants;
DROP POLICY IF EXISTS "Users can update participants of their surveys" ON participants;
DROP POLICY IF EXISTS "Users can delete participants from their surveys" ON participants;
DROP POLICY IF EXISTS "participants_select_policy" ON participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON participants;
DROP POLICY IF EXISTS "participants_update_policy" ON participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON participants;

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create new unified policies
CREATE POLICY "participants_select_policy"
ON participants FOR SELECT
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

CREATE POLICY "participants_insert_policy"
ON participants FOR INSERT
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

CREATE POLICY "participants_update_policy"
ON participants FOR UPDATE
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

CREATE POLICY "participants_delete_policy"
ON participants FOR DELETE
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