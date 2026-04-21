-- ============================================================
-- NOTIFICATIONS TABLE — Run in Supabase SQL Editor
-- ============================================================

create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),

  -- targeting: null = broadcast to all doctors, set uid = specific doctor
  firebase_uid    text,                 -- null means send to ALL doctors

  -- content
  type            text not null default 'platform',
                                        -- platform | consultation | payment | appointment | alert
  title           text not null,
  message         text not null,
  action_url      text,                 -- optional deep link e.g. /earnings

  -- state (per-doctor read tracking)
  is_read         boolean default false,
  read_at         timestamptz,

  -- admin who sent it
  sent_by         text,                 -- admin firebase_uid or name
  created_at      timestamptz default now()
);

alter table notifications enable row level security;

-- Doctors can read notifications targeted to them OR broadcast (firebase_uid is null)
create policy "doctor_read_notifications" on notifications
  for select using (
    firebase_uid is null
    or firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Doctors can mark their own notifications as read
create policy "doctor_update_notifications" on notifications
  for update using (
    firebase_uid is null
    or firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Allow anon insert (for admin page which uses anon key)
create policy "admin_insert_notifications" on notifications
  for insert with check (true);

-- ── SAMPLE DATA (optional — remove before production) ────────────────────────
insert into notifications (firebase_uid, type, title, message, sent_by) values
  (null, 'platform', 'Welcome to MediConnect!', 'Your account has been approved. You can now start accepting consultations.', 'admin'),
  (null, 'platform', 'New Feature: AI Insights', 'AI-assisted diagnosis suggestions are now available during consultations.', 'admin'),
  (null, 'alert', 'Scheduled Maintenance', 'The platform will be under maintenance on Sunday 2 AM – 4 AM IST.', 'admin');

-- ── ADMIN QUERIES ─────────────────────────────────────────────────────────────

-- Send notification to all doctors
-- insert into notifications (firebase_uid, type, title, message, sent_by)
-- values (null, 'platform', 'Your Title', 'Your message here', 'admin');

-- Send notification to a specific doctor
-- insert into notifications (firebase_uid, type, title, message, sent_by)
-- values ('<doctor_firebase_uid>', 'alert', 'Your Title', 'Your message here', 'admin');

-- View all notifications
-- select * from notifications order by created_at desc;

-- View unread count per doctor
-- select firebase_uid, count(*) as unread
-- from notifications
-- where is_read = false
-- group by firebase_uid;
