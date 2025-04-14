-- Enable RLS for shared_analytics_links
ALTER TABLE shared_analytics_links ENABLE ROW LEVEL SECURITY;

-- Policies for shared_analytics_links
CREATE POLICY "Users can view their own shared analytics links"
ON shared_analytics_links
FOR SELECT
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create shared analytics links for their surveys"
ON shared_analytics_links
FOR INSERT
TO authenticated
WITH CHECK (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their shared analytics links"
ON shared_analytics_links
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

CREATE POLICY "Users can delete their shared analytics links"
ON shared_analytics_links
FOR DELETE
TO authenticated
USING (
    survey_id IN (
        SELECT id FROM surveys 
        WHERE user_id = auth.uid()
    )
);

-- Special policy to allow anonymous access to shared analytics links via token
CREATE POLICY "Anyone can view shared analytics links by token"
ON shared_analytics_links
FOR SELECT
TO anon
USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
); 