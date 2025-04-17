-- Enable RLS
alter table surveys enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their workspace surveys" on surveys;
drop policy if exists "Users can create surveys in their workspace" on surveys;
drop policy if exists "Users can update their workspace surveys" on surveys;
drop policy if exists "Users can delete their workspace surveys" on surveys;

-- Create policies for workspace-based access
create policy "Users can view their workspace surveys"
on surveys for select
using (
  workspace_id in (
    select workspace_id 
    from workspace_members 
    where user_id = auth.uid() 
    and status = 'active'
  )
);

create policy "Users can create surveys in their workspace"
on surveys for insert
with check (
  workspace_id in (
    select workspace_id 
    from workspace_members 
    where user_id = auth.uid() 
    and status = 'active'
  )
);

create policy "Users can update their workspace surveys"
on surveys for update
using (
  workspace_id in (
    select workspace_id 
    from workspace_members 
    where user_id = auth.uid() 
    and status = 'active'
  )
)
with check (
  workspace_id in (
    select workspace_id 
    from workspace_members 
    where user_id = auth.uid() 
    and status = 'active'
  )
);

create policy "Users can delete their workspace surveys"
on surveys for delete
using (
  workspace_id in (
    select workspace_id 
    from workspace_members 
    where user_id = auth.uid() 
    and status = 'active'
  )
); 