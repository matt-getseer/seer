-- Function to create or update survey responses
CREATE OR REPLACE FUNCTION upsert_survey_response(
    p_participant_token text,
    p_answers jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response_id uuid;
    v_participant_id uuid;
    v_survey_id uuid;
    v_created_at timestamptz;
BEGIN
    -- Get participant and survey IDs from token
    SELECT p.id, p.survey_id INTO v_participant_id, v_survey_id
    FROM participants p
    WHERE p.participation_token::text = p_participant_token;

    IF v_participant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid participant token';
    END IF;

    -- Check if survey is already completed
    IF EXISTS (
        SELECT 1 FROM survey_responses
        WHERE participant_id = v_participant_id
        AND completed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Survey is already completed';
    END IF;

    -- Insert or update the survey response
    WITH upserted AS (
        INSERT INTO survey_responses (
            participant_id,
            survey_id,
            answers
        )
        VALUES (
            v_participant_id,
            v_survey_id,
            p_answers
        )
        ON CONFLICT (participant_id)
        DO UPDATE SET
            answers = p_answers,
            updated_at = timezone('utc'::text, now())
        RETURNING id, created_at
    )
    SELECT id, created_at INTO v_response_id, v_created_at FROM upserted;

    -- Return the response data
    RETURN json_build_object(
        'id', v_response_id,
        'participant_id', v_participant_id,
        'survey_id', v_survey_id,
        'answers', p_answers,
        'created_at', v_created_at,
        'completed_at', null
    );
END;
$$;

-- Function to mark a survey response as completed
CREATE OR REPLACE FUNCTION complete_survey_response(
    p_participant_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response_data json;
    v_participant_id uuid;
BEGIN
    -- Get participant ID from token
    SELECT id INTO v_participant_id
    FROM participants
    WHERE participation_token::text = p_participant_token;

    IF v_participant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid participant token';
    END IF;

    -- Update the survey response to mark it as completed
    UPDATE survey_responses
    SET 
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE 
        participant_id = v_participant_id
        AND completed_at IS NULL
    RETURNING json_build_object(
        'id', id,
        'participant_id', participant_id,
        'survey_id', survey_id,
        'answers', answers,
        'created_at', created_at,
        'completed_at', completed_at
    ) INTO v_response_data;

    IF v_response_data IS NULL THEN
        RAISE EXCEPTION 'Survey response not found or already completed';
    END IF;

    RETURN v_response_data;
END;
$$;

-- Drop existing constraints if they exist
DO $$ BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_participant_survey'
    ) THEN
        ALTER TABLE survey_responses DROP CONSTRAINT unique_participant_survey;
    END IF;

    -- Drop the new constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_participant_response'
    ) THEN
        ALTER TABLE survey_responses DROP CONSTRAINT unique_participant_response;
    END IF;
END $$;

-- Add the new constraint
ALTER TABLE survey_responses ADD CONSTRAINT unique_participant_response UNIQUE (participant_id); 