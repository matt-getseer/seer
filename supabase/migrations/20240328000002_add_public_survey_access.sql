-- Drop any existing public access policies
DROP POLICY IF EXISTS "Public can view surveys via participant token" ON surveys;

-- Create policy for public access to surveys via participant token
CREATE POLICY "Public can view surveys via participant token"
ON surveys FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.survey_id = surveys.id
        AND participants.participation_token = COALESCE(
            NULLIF(regexp_replace(current_setting('request.query.participation_token'::text, true), '^eq\.'::text, ''::text), ''::text),
            participants.participation_token
        )
    )
);

-- Also add a policy for public access to survey questions via participant token
DROP POLICY IF EXISTS "Public can view questions via participant token" ON survey_questions;

CREATE POLICY "Public can view questions via participant token"
ON survey_questions FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.survey_id = survey_questions.survey_id
        AND participants.participation_token = COALESCE(
            NULLIF(regexp_replace(current_setting('request.query.participation_token'::text, true), '^eq\.'::text, ''::text), ''::text),
            participants.participation_token
        )
    )
); 