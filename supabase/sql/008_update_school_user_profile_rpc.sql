-- RPC to update a school user's profile. Bypasses RLS so updates work reliably; enforces same-school admin inside the function.
-- Apply in Supabase SQL editor.

begin;

create or replace function public.update_school_user_profile(
  p_target_id uuid,
  p_full_name text default null,
  p_email text default null,
  p_role text default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_school_id uuid;
  v_caller_role text;
  v_target_school_id uuid;
  v_admin_roles text[] := array['admin', 'super-admin', 'super_admin', 'super admin'];
begin
  -- Get caller's school and role
  select school_id, trim(lower(role))
  into v_caller_school_id, v_caller_role
  from public.profiles
  where id = auth.uid();

  if v_caller_school_id is null or not (v_caller_role = any(v_admin_roles)) then
    return jsonb_build_object('ok', false, 'error', 'Caller is not an admin in a school.');
  end if;

  -- Get target's school
  select school_id into v_target_school_id
  from public.profiles
  where id = p_target_id;

  if v_target_school_id is null then
    return jsonb_build_object('ok', false, 'error', 'Target user not found.');
  end if;

  if v_target_school_id is distinct from v_caller_school_id then
    return jsonb_build_object('ok', false, 'error', 'You can only update users in your own school.');
  end if;

  -- Update only provided fields
  update public.profiles
  set
    updated_at = now(),
    full_name = coalesce(p_full_name, full_name),
    email = case when p_email is not null then p_email else email end,
    role = coalesce(p_role, role),
    is_active = coalesce(p_is_active, is_active)
  where id = p_target_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Update failed.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.update_school_user_profile(uuid, text, text, text, boolean) is
  'Updates a profile; caller must be an admin in the same school.';

grant execute on function public.update_school_user_profile(uuid, text, text, text, boolean) to authenticated;

commit;
