-- Update the add_participant function to match delete_participant's permission pattern
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
  current_user_id uuid;
begin
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if the user has access to the survey
  if not exists (
    select 1 
    from surveys s
    where s.id = p_survey_id
    and (
      -- Direct ownership
      s.user_id = current_user_id
      OR
      -- Or workspace membership
      exists (
        select 1 
        from workspace_members wm
        where wm.workspace_id = s.workspace_id
        and wm.user_id = current_user_id
        and wm.status = 'active'
      )
    )
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