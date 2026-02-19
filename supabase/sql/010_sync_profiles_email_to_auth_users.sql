-- When profiles.email is updated, sync it to auth.users so sign-in email stays in sync.
-- Runs with SECURITY DEFINER so it can write to auth.users.
-- Apply in Supabase SQL editor.

begin;

create or replace function public.sync_profiles_email_to_auth_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only run when email actually changed and new value is non-empty
  if old.email is distinct from new.email and new.email is not null and trim(new.email) != '' then
    update auth.users
    set
      email = trim(new.email),
      updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

comment on function public.sync_profiles_email_to_auth_users() is
  'Trigger function: sync profiles.email to auth.users when profiles.email is updated.';

drop trigger if exists profiles_sync_email_to_auth on public.profiles;

create trigger profiles_sync_email_to_auth
  after update of email on public.profiles
  for each row
  execute function public.sync_profiles_email_to_auth_users();

commit;
