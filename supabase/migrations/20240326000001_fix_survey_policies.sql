-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys in their workspace" ON surveys;
DROP POLICY IF EXISTS "Users can update their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can view surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can create surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can update surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can delete surveys" ON surveys;

-- Create new workspace-based policies
CREATE POLICY "Workspace members can view surveys"
ON surveys
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.workspace_id = surveys.workspace_id
    )
);

CREATE POLICY "Workspace members can create surveys"
ON surveys
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.workspace_id = NEW.workspace_id
    )
);

CREATE POLICY "Workspace members can update surveys"
ON surveys
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.workspace_id = surveys.workspace_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.workspace_id = NEW.workspace_id
    )
);

CREATE POLICY "Workspace members can delete surveys"
ON surveys
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.workspace_id = surveys.workspace_id
    )
); 