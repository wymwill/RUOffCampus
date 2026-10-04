-- Open sign-up to any email, and label Rutgers accounts instead.
--
-- A user is "Rutgers verified" when their auth email is rutgers.edu or a
-- subdomain (scarletmail.rutgers.edu, ...) AND the email is confirmed. The
-- flag is copied from auth.users by triggers, so it can't be set by clients:
--   profiles.is_rutgers       shown next to people in messages
--   listings.host_is_rutgers  shown on listings and used by the Posted by filter
-- profiles.email is also kept equal to the auth email, so a user can't make
-- their profile look like a different (Rutgers) address.

-- 1. Remove the Rutgers-only sign-up gate.
drop trigger if exists enforce_rutgers_email_domain_on_insert on auth.users;
drop trigger if exists enforce_rutgers_email_domain_on_update on auth.users;
drop function if exists public.enforce_rutgers_email_domain();

create or replace function public.is_rutgers_email(email_to_check text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    lower(split_part(email_to_check, '@', 2)) = 'rutgers.edu'
      or lower(split_part(email_to_check, '@', 2)) like '%.rutgers.edu',
    false
  );
$$;

create or replace function public.is_rutgers_user(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select public.is_rutgers_email(u.email) and u.email_confirmed_at is not null
      from auth.users u
      where u.id = user_id
    ),
    false
  );
$$;

-- 2. Profiles carry the trusted flag and the real auth email.
alter table public.profiles add column if not exists is_rutgers boolean not null default false;

create or replace function public.sync_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  new.is_rutgers := public.is_rutgers_user(new.id);
  return new;
end;
$$;

drop trigger if exists sync_profile_identity on public.profiles;
create trigger sync_profile_identity
  before insert or update on public.profiles
  for each row execute function public.sync_profile_identity();

-- 3. Listings carry the host's flag, set from the host, never from the client.
alter table public.listings add column if not exists host_is_rutgers boolean not null default false;

create or replace function public.sync_listing_host_is_rutgers()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  new.host_is_rutgers := new.host_id is not null and public.is_rutgers_user(new.host_id);
  return new;
end;
$$;

drop trigger if exists sync_listing_host_is_rutgers on public.listings;
create trigger sync_listing_host_is_rutgers
  before insert or update on public.listings
  for each row execute function public.sync_listing_host_is_rutgers();

create index if not exists listings_host_is_rutgers_idx on public.listings (host_is_rutgers);

-- 4. When a user confirms or changes their email, refresh both flags.
create or replace function public.refresh_rutgers_flags()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- The profile and listing triggers recompute the flag on any update.
  update public.profiles set updated_at = now() where id = new.id;
  -- Older rows can break NOT VALID checks added by earlier migrations, and
  -- an update re-checks them, so skip those rather than fail the update.
  update public.listings set host_id = host_id
  where host_id = new.id and (price_monthly > 0 or is_imported);
  return new;
end;
$$;

drop trigger if exists refresh_rutgers_flags on auth.users;
create trigger refresh_rutgers_flags
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.refresh_rutgers_flags();

-- 5. Backfill existing rows through the same triggers.
update public.profiles set updated_at = updated_at;
update public.listings set host_id = host_id
where host_id is not null and (price_monthly > 0 or is_imported);
