-- Site admins. Admin tools run in the backend with the service role after it
-- checks profiles.is_admin, so the flag must never be settable by a user.
-- Signed in users write as the authenticated role, so the trigger keeps the
-- old value for them. Only SQL (the dashboard) and the service role change it.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_flag();

-- The owner account.
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = 'scarletsublet@gmail.com';
