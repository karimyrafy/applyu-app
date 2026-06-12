-- Run this in the Supabase SQL editor to enable the Counselor tier.
-- Adds an is_counselor flag to the profiles table (mirrors is_pro).

alter table public.profiles
  add column if not exists is_counselor boolean not null default false;

-- Optional: quick way to manually grant counselor access to a test account
-- update public.profiles set is_counselor = true where email = 'you@example.com';
