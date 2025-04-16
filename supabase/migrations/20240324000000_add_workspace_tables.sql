-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add workspace_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON public.profiles(workspace_id);

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces
CREATE POLICY "Workspace members can view"
    ON public.workspaces
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.workspace_id = workspaces.id
            AND profiles.id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.workspaces TO authenticated;

-- Create function to create initial workspace for owner
CREATE OR REPLACE FUNCTION public.create_initial_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create workspace if user is an admin (first user/owner)
    IF EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = NEW.id 
        AND role = 'admin'
    ) THEN
        -- Create the workspace
        INSERT INTO public.workspaces (name, owner_id)
        VALUES ('My Workspace', NEW.id)
        RETURNING id INTO NEW.workspace_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create workspace on profile creation
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_workspace(); 