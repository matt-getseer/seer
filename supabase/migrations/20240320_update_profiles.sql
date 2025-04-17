-- Add new columns to profiles table if they don't exist
do $$ 
begin
    -- Add invited_by column
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'invited_by'
    ) then
        alter table public.profiles 
        add column invited_by uuid references auth.users(id);
    end if;

    -- Add password_setup_complete column
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'password_setup_complete'
    ) then
        alter table public.profiles 
        add column password_setup_complete boolean default false;
    end if;

    -- Add invited_at column
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'invited_at'
    ) then
        alter table public.profiles 
        add column invited_at timestamp with time zone;
    end if;

    -- Add status column if it doesn't exist
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'status'
    ) then
        alter table public.profiles 
        add column status text check (status in ('active', 'pending', 'invited')) default 'pending';
    end if;
end $$; 