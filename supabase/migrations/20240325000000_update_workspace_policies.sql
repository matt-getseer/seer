-- Drop all existing policies (both user-based and workspace-based)
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Users can insert responses to their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Users can update responses to their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Users can delete responses to their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can view responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can insert responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can update responses" ON survey_responses;
DROP POLICY IF EXISTS "Workspace members can delete responses" ON survey_responses;

DROP POLICY IF EXISTS "Users can view their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can view surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can create surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can update surveys" ON surveys;
DROP POLICY IF EXISTS "Workspace members can delete surveys" ON surveys;

DROP POLICY IF EXISTS "Workspace members can view workspace" ON public.workspaces;

DROP POLICY IF EXISTS "Workspace members can view questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can insert questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can update questions" ON survey_questions;
DROP POLICY IF EXISTS "Workspace members can delete questions" ON survey_questions;

DROP POLICY IF EXISTS "Workspace members can view participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can add participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can update participants" ON participants;
DROP POLICY IF EXISTS "Workspace members can delete participants" ON participants;

DROP POLICY IF EXISTS "Workspace members can view shared analytics" ON shared_analytics_links;
DROP POLICY IF EXISTS "Workspace members can create shared analytics" ON shared_analytics_links;
DROP POLICY IF EXISTS "Workspace members can update shared analytics" ON shared_analytics_links;
DROP POLICY IF EXISTS "Workspace members can delete shared analytics" ON shared_analytics_links;
DROP POLICY IF EXISTS "Anyone can view shared analytics links by token" ON shared_analytics_links;

-- Update workspace policies to allow full access within workspace
CREATE POLICY "Workspace members can view workspace"
    ON public.workspaces
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.workspace_id = workspaces.id
            AND profiles.id = auth.uid()
        )
    );

-- Add workspace-based policies for surveys
CREATE POLICY "Workspace members can view surveys"
    ON surveys
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.workspace_id = (
                SELECT workspace_id FROM profiles
                WHERE id = surveys.user_id
            )
        )
    );

CREATE POLICY "Workspace members can create surveys"
    ON surveys
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.workspace_id IS NOT NULL
        )
    );

CREATE POLICY "Workspace members can update surveys"
    ON surveys
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.workspace_id = (
                SELECT workspace_id FROM profiles
                WHERE id = surveys.user_id
            )
        )
    );

CREATE POLICY "Workspace members can delete surveys"
    ON surveys
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.workspace_id = (
                SELECT workspace_id FROM profiles
                WHERE id = surveys.user_id
            )
        )
    );

-- Add workspace-based policies for survey responses
CREATE POLICY "Workspace members can view responses"
    ON survey_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_responses.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can insert responses"
    ON survey_responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_responses.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can update responses"
    ON survey_responses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_responses.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can delete responses"
    ON survey_responses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_responses.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

-- Add workspace-based policies for survey questions
CREATE POLICY "Workspace members can view questions"
    ON survey_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_questions.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can insert questions"
    ON survey_questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_questions.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can update questions"
    ON survey_questions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_questions.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can delete questions"
    ON survey_questions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = survey_questions.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

-- Add workspace-based policies for participants
CREATE POLICY "Workspace members can view participants"
    ON participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = participants.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can add participants"
    ON participants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = participants.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can update participants"
    ON participants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = participants.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can delete participants"
    ON participants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = participants.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

-- Add workspace-based policies for shared analytics
CREATE POLICY "Workspace members can view shared analytics"
    ON shared_analytics_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = shared_analytics_links.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can create shared analytics"
    ON shared_analytics_links
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = shared_analytics_links.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can update shared analytics"
    ON shared_analytics_links
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = shared_analytics_links.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

CREATE POLICY "Workspace members can delete shared analytics"
    ON shared_analytics_links
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles survey_owner ON survey_owner.id = (
                SELECT user_id FROM surveys WHERE id = shared_analytics_links.survey_id
            )
            WHERE p.id = auth.uid()
            AND p.workspace_id = survey_owner.workspace_id
        )
    );

-- Keep the anonymous access policy for shared analytics
CREATE POLICY "Anyone can view shared analytics links by token"
    ON shared_analytics_links
    FOR SELECT
    TO anon
    USING (
        is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    ); 