-- ============================================================
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. FEEDBACK / COMPLAINTS TABLE ───────────────────────────────────────────
create table if not exists doctor_feedback (
  id              uuid primary key default uuid_generate_v4(),
  firebase_uid    text not null,
  doctor_name     text,
  doctor_email    text,
  type            text not null,        -- feedback | complaint
  rating          integer,              -- 1-5, only for feedback
  message         text not null,
  -- location at time of submission
  latitude        double precision,
  longitude       double precision,
  location_city   text,
  location_region text,
  location_country text,
  ip_address      text,
  submitted_at    timestamptz default now()
);

alter table doctor_feedback enable row level security;

create policy "doctor_insert_feedback" on doctor_feedback
  for insert with check (true);

create policy "doctor_select_own_feedback" on doctor_feedback
  for select using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── 2. DOCTOR SESSIONS TABLE (login location tracking) ───────────────────────
create table if not exists doctor_sessions (
  id              uuid primary key default uuid_generate_v4(),
  firebase_uid    text not null,
  doctor_name     text,
  doctor_email    text,
  latitude        double precision,
  longitude       double precision,
  location_city   text,
  location_region text,
  location_country text,
  ip_address      text,
  user_agent      text,
  logged_in_at    timestamptz default now()
);

alter table doctor_sessions enable row level security;

create policy "doctor_insert_session" on doctor_sessions
  for insert with check (true);

create policy "doctor_select_own_sessions" on doctor_sessions
  for select using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── ADMIN QUERIES ─────────────────────────────────────────────────────────────

-- View all feedback/complaints
-- select df.*, d.full_name, d.email
-- from doctor_feedback df
-- left join doctors d on d.firebase_uid = df.firebase_uid
-- order by df.submitted_at desc;

-- View complaints only
-- select * from doctor_feedback where type = 'complaint' order by submitted_at desc;

-- View all login sessions with location
-- select ds.*, d.full_name
-- from doctor_sessions ds
-- left join doctors d on d.firebase_uid = ds.firebase_uid
-- order by ds.logged_in_at desc;

-- View sessions for a specific doctor
-- select * from doctor_sessions where firebase_uid = '<uid>' order by logged_in_at desc;
