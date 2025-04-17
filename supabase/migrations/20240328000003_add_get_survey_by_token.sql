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
    v_participant_id uuid;
    v_survey_id uuid;
    v_response_data json;
BEGIN
    -- Get participant and survey IDs from token
    SELECT p.id, p.survey_id INTO v_participant_id, v_survey_id
    FROM participants p
    WHERE p.participation_token::text = p_token;

    IF v_participant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid participant token';
    END IF;

    -- Check if survey is already completed
    SELECT json_build_object(
        'id', sr.id,
        'created_at', sr.created_at,
        'completed_at', sr.completed_at,
        'answers', sr.answers
    )
    INTO v_response_data
    FROM survey_responses sr
    WHERE sr.participant_id = v_participant_id;

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
            WHERE s.id = v_survey_id
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
            WHERE p.id = v_participant_id
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
            WHERE q.survey_id = v_survey_id
        ),
        'response', v_response_data
    ) INTO v_survey_data;

    -- Check if we found any data
    IF v_survey_data->>'survey' IS NULL THEN
        RAISE EXCEPTION 'Survey not found for the given token';
    END IF;

    -- If there's a completed response, raise an exception
    IF v_response_data->>'completed_at' IS NOT NULL THEN
        RAISE EXCEPTION 'Survey has already been completed';
    END IF;

    RETURN v_survey_data;
END;
$$; 