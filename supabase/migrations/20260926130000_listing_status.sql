-- Hosts can pause a listing or mark it taken without deleting it.
-- Only active listings show up in search.

alter table public.listings add column if not exists status text not null default 'active';

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check
  check (status in ('active', 'paused', 'taken'));

create index if not exists listings_status_idx on public.listings (status);
