-- Visitor and member feedback for the site.
-- Rows are inserted by the backend with the service role. The table has no
-- public policies, so feedback stays private to the team.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 1 and 4000),
  email text check (email is null or char_length(email) <= 320),
  page text check (page is null or char_length(page) <= 200),
  profile_id uuid references public.profiles (id) on delete set null
);

alter table public.feedback enable row level security;
