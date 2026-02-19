-- Returns school users with email and last_sign_in_at from auth.users.
-- Callable only by authenticated users whose profile has the same school_id.
-- Apply in Supabase SQL editor (or migrations pipeline).

begin;

create or replace function public.get_school_users_with_auth(p_school_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    coalesce(nullif(trim(p.email), ''), u.email) as email,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.school_id = p_school_id
    and exists (
      select 1 from public.profiles caller
      where caller.id = auth.uid()
        and caller.school_id = p_school_id
    )
  order by p.full_name;
$$;

comment on function public.get_school_users_with_auth(uuid) is
  'Returns profiles for a school joined with auth.users (email, last_sign_in_at). Caller must belong to that school.';

-- Allow authenticated users to execute (function enforces school membership)
grant execute on function public.get_school_users_with_auth(uuid) to authenticated;

commit;
