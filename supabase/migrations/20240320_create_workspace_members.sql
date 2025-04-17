-- Create workspace_members table
create table if not exists public.workspace_members (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    role text check (role in ('owner', 'admin', 'member')) not null default 'member',
    status text check (status in ('active', 'pending', 'invited')) not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, workspace_id)
);

-- Set up RLS (Row Level Security)
alter table public.workspace_members enable row level security;

-- Policies
create policy "Users can view their own workspace memberships"
    on public.workspace_members
    for select
    using (auth.uid() = user_id);

create policy "Workspace admins can manage members"
    on public.workspace_members
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = workspace_members.workspace_id
            and user_id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

-- Add workspace_id to profiles if not exists
do $$ 
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'workspace_id'
    ) then
        alter table public.profiles 
        add column workspace_id uuid references public.workspaces(id);
    end if;
end $$; 