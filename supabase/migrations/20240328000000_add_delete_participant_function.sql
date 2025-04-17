-- Create the delete_participant function
create or replace function delete_participant(participant_id uuid, survey_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the user has access to the survey
  if not exists (
    select 1 
    from surveys s
    where s.id = survey_id
    and s.user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  -- Delete survey responses first
  delete from survey_responses
  where participant_id = $1
  and survey_id = $2;

  -- Then delete the participant
  delete from participants
  where id = $1
  and survey_id = $2;
end;
$$; 