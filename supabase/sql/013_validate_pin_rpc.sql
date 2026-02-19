-- RPC to validate a PIN (creation_token) and return user info if valid.
-- Allows anonymous users to validate their PIN before completing sign-up.
-- Apply in Supabase SQL editor.

begin;

create or replace function public.validate_pin(p_creation_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  -- Find profile with this creation_token
  select id, email, full_name, role, is_active
  into v_profile
  from public.profiles
  where creation_token = p_creation_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid PIN.');
  end if;

  -- Check if already activated
  if v_profile.is_active then
    return jsonb_build_object('ok', false, 'error', 'This account is already activated. Please sign in instead.');
  end if;

  -- Return user info (without sensitive data)
  return jsonb_build_object(
    'ok', true,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'role', v_profile.role
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'Failed to validate PIN.');
end;
$$;

comment on function public.validate_pin(text) is
  'Validates a creation_token PIN and returns user info if valid. Allows anonymous access.';

grant execute on function public.validate_pin(text) to anon, authenticated;

commit;
