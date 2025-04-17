-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys in their workspace" ON surveys;
DROP POLICY IF EXISTS "Users can update their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their workspace surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can view surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can create surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can update surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can delete surveys" ON surveys;

DROP POLICY IF EXISTS "Workspace members can view responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can create responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can update responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can delete responses" ON survey_responses;

DROP POLICY IF EXISTS "Workspace members can view questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can create questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can update questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can delete questions" ON survey_questions;

DROP POLICY IF EXISTS "Workspace members can view participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can create participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can update participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can delete participants" ON participants;

DROP POLICY IF EXISTS "Workspace members can view analysis" ON survey_analysis;
DROP POLICY IF EXISTS "Workspace members can create analysis" ON survey_analysis;
DROP POLICY IF EXISTS "Workspace members can update analysis" ON survey_analysis;
DROP POLICY IF EXISTS "Workspace members can delete analysis" ON survey_analysis;

-- Enable RLS for all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_analysis ENABLE ROW LEVEL SECURITY;

-- Survey Policies
CREATE POLICY "Workspace members can view surveys"
ON surveys FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

CREATE POLICY "Workspace members can create surveys"
ON surveys FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

CREATE POLICY "Workspace members can update surveys"
ON surveys FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

CREATE POLICY "Workspace members can delete surveys"
ON surveys FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Survey Responses Policies
CREATE POLICY "Workspace members can view responses"
ON survey_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_responses.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can create responses"
ON survey_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_responses.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can update responses"
ON survey_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_responses.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can delete responses"
ON survey_responses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_responses.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

-- Survey Questions Policies
CREATE POLICY "Workspace members can view questions"
ON survey_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can create questions"
ON survey_questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can update questions"
ON survey_questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can delete questions"
ON survey_questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

-- Participants Policies
CREATE POLICY "Workspace members can view participants"
ON participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = participants.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can create participants"
ON participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = participants.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can update participants"
ON participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = participants.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can delete participants"
ON participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = participants.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

-- Survey Analysis Policies
CREATE POLICY "Workspace members can view analysis"
ON survey_analysis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_analysis.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can create analysis"
ON survey_analysis FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_analysis.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can update analysis"
ON survey_analysis FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_analysis.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
);

CREATE POLICY "Workspace members can delete analysis"
ON survey_analysis FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_analysis.survey_id
    AND s.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
); 