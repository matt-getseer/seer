-- Enable RLS for surveys
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Policies for surveys
CREATE POLICY "Users can view their own surveys"
ON surveys
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can create their own surveys"
ON surveys
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can update their own surveys"
ON surveys
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can delete their own surveys"
ON surveys
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
); 