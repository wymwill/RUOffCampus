-- Profile page fields. name and avatar_url already exist. Users edit their own
-- row under the existing "Users can update own profile" policy, and the
-- identity and admin triggers keep email, is_rutgers and is_admin trusted.
-- avatar_url holds a small resized image as a data URL, like listing photos.

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists class_year smallint;

alter table public.profiles drop constraint if exists profiles_name_length;
alter table public.profiles
  add constraint profiles_name_length check (name is null or char_length(name) <= 60);

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 500);

alter table public.profiles drop constraint if exists profiles_pronouns_length;
alter table public.profiles
  add constraint profiles_pronouns_length check (pronouns is null or char_length(pronouns) <= 30);

alter table public.profiles drop constraint if exists profiles_class_year_range;
alter table public.profiles
  add constraint profiles_class_year_range check (class_year is null or class_year between 1950 and 2040);

alter table public.profiles drop constraint if exists profiles_avatar_size;
alter table public.profiles
  add constraint profiles_avatar_size check (avatar_url is null or char_length(avatar_url) <= 200000);
