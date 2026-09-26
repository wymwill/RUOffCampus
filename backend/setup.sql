-- ============================================================
-- Initial Supabase schema for SubletMatching.
-- For existing projects, prefer:
--   supabase/migrations/20260501120000_use_profiles_for_user_relationships.sql
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx
  on public.profiles (email)
  where email is not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  address text,
  price_monthly integer not null check (price_monthly > 0),
  price_label text,
  campus_location text check (campus_location in ('Busch', 'College Ave', 'Livingston', 'Cook/Douglass')),
  beds integer default 0 check (beds >= 0),
  baths numeric default 0 check (baths >= 0),
  property_type text,
  distance numeric,
  image_url text,
  images jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '{}'::jsonb,
  available_from date,
  available_to date,
  landlord_phone text,
  landlord_email text,
  latitude numeric,
  longitude numeric,
  host_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists listings_host_id_idx on public.listings (host_id);
create index if not exists listings_created_at_idx on public.listings (created_at desc);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_listing_id_idx on public.favorites (listing_id);
create unique index if not exists favorites_user_id_listing_id_unique_idx
  on public.favorites (user_id, listing_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists conversations_created_by_idx on public.conversations (created_by);
create index if not exists conversation_participants_profile_id_idx
  on public.conversation_participants (profile_id);
create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);

create or replace function public.is_conversation_participant(
  conversation_id_to_check uuid,
  profile_id_to_check uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_id_to_check
      and cp.profile_id = profile_id_to_check
  );
$$;

create or replace function public.is_conversation_creator(
  conversation_id_to_check uuid,
  profile_id_to_check uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conversation_id_to_check
      and c.created_by = profile_id_to_check
  );
$$;

create or replace function public.shares_conversation_with(
  other_profile_id uuid,
  profile_id_to_check uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants mine
    join public.conversation_participants theirs
      on theirs.conversation_id = mine.conversation_id
    where mine.profile_id = profile_id_to_check
      and theirs.profile_id = other_profile_id
  );
$$;

create or replace function public.conversation_listing_host(conversation_id_to_check uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.host_id
  from public.conversations c
  join public.listings l on l.id = c.listing_id
  where c.id = conversation_id_to_check;
$$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can read own and conversation profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Profiles hold emails, so only the owner and people sharing a conversation see them.
create policy "Users can read own and conversation profiles"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_conversation_with(id, auth.uid()));

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Public read access" on public.listings;
drop policy if exists "Users can insert own listings" on public.listings;
drop policy if exists "Users can update own listings" on public.listings;
drop policy if exists "Users can delete own listings" on public.listings;

create policy "Public read access"
  on public.listings for select using (true);

create policy "Users can insert own listings"
  on public.listings for insert to authenticated with check (host_id = auth.uid());

create policy "Users can update own listings"
  on public.listings
  for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "Users can delete own listings"
  on public.listings for delete to authenticated using (host_id = auth.uid());

drop policy if exists "Users can read own favorites" on public.favorites;
drop policy if exists "Users can insert own favorites" on public.favorites;
drop policy if exists "Users can delete own favorites" on public.favorites;

create policy "Users can read own favorites"
  on public.favorites for select to authenticated using (user_id = auth.uid());

create policy "Users can insert own favorites"
  on public.favorites for insert to authenticated with check (user_id = auth.uid());

create policy "Users can delete own favorites"
  on public.favorites for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Creators can update conversations" on public.conversations;
drop policy if exists "Users can add themselves to conversations" on public.conversation_participants;
drop policy if exists "Creators can add themselves and the listing host" on public.conversation_participants;
drop policy if exists "Participants can read participants" on public.conversation_participants;
drop policy if exists "Participants can update own participant row" on public.conversation_participants;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;

create policy "Users can create conversations"
  on public.conversations for insert to authenticated with check (created_by = auth.uid());

create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_conversation_participant(id, auth.uid())
  );

create policy "Creators can update conversations"
  on public.conversations
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Only the creator can add participants, and only themselves and the listing host.
create policy "Creators can add themselves and the listing host"
  on public.conversation_participants
  for insert to authenticated
  with check (
    public.is_conversation_creator(conversation_id, auth.uid())
    and (
      profile_id = auth.uid()
      or profile_id = public.conversation_listing_host(conversation_id)
    )
  );

create policy "Participants can read participants"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "Participants can update own participant row"
  on public.conversation_participants
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Participants can read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "Participants can send messages"
  on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );
