-- Drop the existing insert policy
DROP POLICY IF EXISTS "Workspace members can create participants" ON participants;

-- Add both types of insert policies matching survey_questions pattern
CREATE POLICY "Workspace members can insert participants"
ON participants FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        JOIN profiles survey_owner ON survey_owner.id = (
            SELECT user_id 
            FROM surveys 
            WHERE id = participants.survey_id
        )
        WHERE p.id = auth.uid()
        AND p.workspace_id = survey_owner.workspace_id
    )
);

CREATE POLICY "Workspace members can create participants"
ON participants FOR INSERT
TO public
WITH CHECK (
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