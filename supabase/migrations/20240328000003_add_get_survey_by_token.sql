-- Drop any existing versions of the function
DROP FUNCTION IF EXISTS get_survey_by_token(UUID);
DROP FUNCTION IF EXISTS get_survey_by_token(text);

-- Create a function to get survey data by participant token
CREATE OR REPLACE FUNCTION get_survey_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_survey_data json;
BEGIN
    -- Get the survey data including questions
    SELECT json_build_object(
        'survey', (
            SELECT json_build_object(
                'id', s.id,
                'title', s.title,
                'description', s.description,
                'user_id', s.user_id,
                'workspace_id', s.workspace_id,
                'created_at', s.created_at
            )
            FROM surveys s
            WHERE s.id = (
                SELECT survey_id 
                FROM participants 
                WHERE participation_token::text = p_token
            )
        ),
        'participant', (
            SELECT json_build_object(
                'id', p.id,
                'name', p.name,
                'email', p.email,
                'survey_id', p.survey_id,
                'participation_token', p.participation_token,
                'created_at', p.created_at
            )
            FROM participants p
            WHERE p.participation_token::text = p_token
        ),
        'questions', (
            SELECT json_agg(
                json_build_object(
                    'id', q.id,
                    'question', q.question,
                    'type', q.type,
                    'options', q.options,
                    'required', q.required,
                    'order_number', q.order_number
                )
                ORDER BY q.order_number
            )
            FROM survey_questions q
            WHERE q.survey_id = (
                SELECT survey_id 
                FROM participants 
                WHERE participation_token::text = p_token
            )
        )
    ) INTO v_survey_data;

    -- Check if we found any data
    IF v_survey_data->>'survey' IS NULL THEN
        RAISE EXCEPTION 'Survey not found for the given token';
    END IF;

    RETURN v_survey_data;
END;
$$; 