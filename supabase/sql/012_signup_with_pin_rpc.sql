-- RPC to complete sign-up using PIN (creation_token). Validates PIN, sets password, activates user.
-- Apply in Supabase SQL editor.

begin;

-- Enable pgcrypto extension for password hashing
create extension if not exists pgcrypto;

create or replace function public.signup_with_pin(
  p_creation_token text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_user_id uuid;
begin
  -- Find profile with this creation_token
  select id, email, full_name, role, school_id, is_active
  into v_profile
  from public.profiles
  where creation_token = p_creation_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid PIN.');
  end if;

  -- Found by creation_token, so they have not completed sign-up (token is cleared below).

  v_user_id := v_profile.id;

  -- Update auth.users password
  update auth.users
  set
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
  where id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'User account not found.');
  end if;

  -- Activate profile and clear creation_token (optional - you can keep it if you want)
  update public.profiles
  set
    is_active = true,
    creation_token = null, -- Clear token after use (or keep it if you want reusable PINs)
    updated_at = now()
  where id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'email', v_profile.email
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

comment on function public.signup_with_pin(text, text) is
  'Completes user sign-up by validating PIN and setting password.';

grant execute on function public.signup_with_pin(text, text) to anon, authenticated;

commit;
