-- Create the add_participant function
create or replace function add_participant(
  p_name text,
  p_email text,
  p_survey_id uuid,
  p_participation_token uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_participant json;
  v_workspace_id uuid;
begin
  -- Get the workspace_id from the survey
  select workspace_id into v_workspace_id
  from surveys
  where id = p_survey_id;

  -- Check if the user has access to the survey's workspace
  if not exists (
    select 1 
    from workspace_members
    where user_id = auth.uid()
    and workspace_id = v_workspace_id
    and status = 'active'
  ) then
    raise exception 'Access denied: You do not have permission to add participants to this survey';
  end if;

  -- Check if email already exists for this survey
  if exists (
    select 1
    from participants
    where survey_id = p_survey_id
    and email = p_email
  ) then
    raise exception 'A participant with this email already exists in this survey';
  end if;

  -- Insert the participant and return the created record
  insert into participants (
    name,
    email,
    survey_id,
    participation_token
  )
  values (
    p_name,
    p_email,
    p_survey_id,
    p_participation_token
  )
  returning json_build_object(
    'id', id,
    'name', name,
    'email', email,
    'survey_id', survey_id,
    'participation_token', participation_token,
    'created_at', created_at
  ) into v_participant;

  return v_participant;
end;
$$; 