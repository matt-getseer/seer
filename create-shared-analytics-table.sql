-- Create shared_analytics_links table
CREATE TABLE shared_analytics_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT token_length CHECK (char_length(token) >= 10)
);

-- Create index for token lookups
CREATE INDEX idx_shared_analytics_links_token ON shared_analytics_links(token);

-- Create function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_token TEXT;
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random token (20 characters)
        new_token := encode(gen_random_bytes(15), 'hex');
        
        -- Check if token already exists
        SELECT EXISTS (
            SELECT 1 
            FROM shared_analytics_links 
            WHERE token = new_token
        ) INTO token_exists;
        
        -- Exit loop if token is unique
        EXIT WHEN NOT token_exists;
    END LOOP;
    
    RETURN new_token;
END;
$$; 