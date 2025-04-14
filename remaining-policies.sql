-- Enable RLS for survey_responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Policies for survey_responses
CREATE POLICY "Users can view responses to their surveys"
ON survey_responses
FOR SELECT
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert responses to their surveys"
ON survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update responses to their surveys"
ON survey_responses
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

CREATE POLICY "Users can delete responses to their surveys"
ON survey_responses
FOR DELETE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Enable RLS for survey_analysis
ALTER TABLE survey_analysis ENABLE ROW LEVEL SECURITY;

-- Policies for survey_analysis
CREATE POLICY "Users can view analysis of their surveys"
ON survey_analysis
FOR SELECT
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert analysis for their surveys"
ON survey_analysis
FOR INSERT
TO authenticated
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update analysis of their surveys"
ON survey_analysis
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

CREATE POLICY "Users can delete analysis of their surveys"
ON survey_analysis
FOR DELETE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
); 