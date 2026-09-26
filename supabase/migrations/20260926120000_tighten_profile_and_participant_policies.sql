-- Profiles hold every user's email, so only show a profile to its owner and
-- to people who share a conversation with them.
-- Conversation participants can only be added by the conversation creator,
-- and only the creator themselves plus the host of the conversation's listing.

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

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can read own and conversation profiles" on public.profiles;
create policy "Users can read own and conversation profiles"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.shares_conversation_with(id, auth.uid())
  );

drop policy if exists "Users can add themselves to conversations" on public.conversation_participants;
drop policy if exists "Creators can add themselves and the listing host" on public.conversation_participants;
create policy "Creators can add themselves and the listing host"
  on public.conversation_participants
  for insert
  to authenticated
  with check (
    public.is_conversation_creator(conversation_id, auth.uid())
    and (
      profile_id = auth.uid()
      or profile_id = public.conversation_listing_host(conversation_id)
    )
  );
