-- NIPPON SALE — Supabase setup
-- This project uses Supabase Auth with a username-style login.
-- A username is represented internally as: username@nippon-sale.local
-- Create users from Supabase Dashboard > Authentication > Users.
-- Example: username = admin -> email = admin@nippon-sale.local
-- Disable email confirmation for these internal accounts if you do not want email verification.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  role text not null default 'sale' check (role in ('admin','sale')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Automatically create a profile when a user is created in Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  u text;
begin
  u := split_part(new.email, '@', 1);
  insert into public.profiles (id, username, display_name)
  values (new.id, u, u)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


-- Resolve a username to the Auth email during login.
-- Only the username and password are entered by the user.
create or replace function public.resolve_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
