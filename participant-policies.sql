-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting participants
CREATE POLICY "Users can add participants to their surveys"
ON participants
FOR INSERT
TO authenticated
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for viewing participants
CREATE POLICY "Users can view participants of their surveys"
ON participants
FOR SELECT
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for updating participants
CREATE POLICY "Users can update participants of their surveys"
ON participants
FOR UPDATE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for deleting participants
CREATE POLICY "Users can delete participants from their surveys"
ON participants
FOR DELETE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
); 