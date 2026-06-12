-- Run this in the Supabase SQL editor to enable the "Request Info" lead-capture feature.
-- Stores each student's request to be contacted by a specific college's admissions office.
-- This is the foundation for: (1) showing students they took an action, and (2) eventually
-- giving partner colleges/universities a dashboard of interested students (paid analytics).

create table if not exists public.info_requests (
  id uuid primary key default gen_random_uuid(),
  college_name text not null,
  student_name text not null,
  student_email text not null,
  grade text,
  gpa numeric,
  match_pct integer,
  created_at timestamptz not null default now()
);

create index if not exists info_requests_college_idx on public.info_requests (college_name);
create index if not exists info_requests_created_idx on public.info_requests (created_at);

-- Row Level Security: only the service role (used by api/lead.js) can read/write.
alter table public.info_requests enable row level security;
