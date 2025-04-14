-- Enable Row Level Security
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting questions
CREATE POLICY "Users can insert their own survey questions"
ON survey_questions
FOR INSERT
TO authenticated
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for selecting questions
CREATE POLICY "Users can view their own survey questions"
ON survey_questions
FOR SELECT
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for updating questions
CREATE POLICY "Users can update their own survey questions"
ON survey_questions
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

-- Create policy for deleting questions
CREATE POLICY "Users can delete their own survey questions"
ON survey_questions
FOR DELETE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
); 