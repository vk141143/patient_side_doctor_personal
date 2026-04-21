-- ============================================================
-- DOCTORS APP — FRESH SCHEMA
-- Drops the old table and creates a clean new one.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 0. EXTENSIONS ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. DROP OLD TABLE (cascades RLS policies & triggers) ─────────────────────
drop table if exists doctors cascade;

-- ── 2. CREATE NEW TABLE ───────────────────────────────────────────────────────
create table doctors (

  -- primary key
  id                        uuid primary key default uuid_generate_v4(),

  -- ── STEP 1 · Basic Info ───────────────────────────────────────────────────
  firebase_uid              text unique not null,   -- Firebase Auth UID
  full_name                 text,
  email                     text unique not null,
  city                      text,
  state                     text,
  gender                    text,                   -- Male | Female | Other
  -- NOTE: password is stored in Firebase Auth only, never here

  -- ── STEP 2 · Identity Verification ───────────────────────────────────────
  id_type                   text,                   -- aadhaar | passport | driving | voter
  id_proof_url              text,                   -- Supabase Storage: doctor-documents/{uid}/id_proof
  selfie_url                text,                   -- Supabase Storage: doctor-images/{uid}/selfie
  passport_photo_url        text,                   -- Supabase Storage: doctor-images/{uid}/passport_photo

  -- ── STEP 3 · Medical Credentials ─────────────────────────────────────────
  mbbs_cert_number          text,                   -- MBBS certificate number
  mbbs_year_of_passing      text,
  postgrad_type             text,                   -- MD | MS | DNB | Diploma (nullable if not applicable)
  postgrad_cert_number      text,
  postgrad_year_of_passing  text,
  registration_number       text,                   -- Medical council registration number
  council_name              text,                   -- State medical council name
  year_of_registration      text,

  -- ── STEP 4 · Professional Profile ────────────────────────────────────────
  specialization            text,
  experience_years          integer,
  practice_type             text,                   -- clinic | individual
  hospital_name             text,                   -- clinic/hospital name
  clinic_address            text,                   -- only if practice_type = clinic
  clinic_license            text,                   -- GST / license number of clinic
  languages                 text[],
  service_chat              boolean default false,
  service_opd               boolean default false,
  consult_duration          integer default 15,     -- minutes

  -- ── STEP 5 · Payment Details ──────────────────────────────────────────────
  account_holder            text,
  account_number            text,
  ifsc_code                 text,
  pan_number                text,
  gst_number                text,
  bank_document_url         text,                   -- Supabase Storage: doctor-documents/{uid}/bank_document

  -- ── STEP 6 · Legal Consent ───────────────────────────────────────────────
  consent_registered        boolean default false,
  consent_guidelines        boolean default false,
  consent_terms             boolean default false,
  consent_prescriptions     boolean default false,
  consent_data_processing   boolean default false,

  -- ── ADMIN APPROVAL ───────────────────────────────────────────────────────
  status                    text default 'pending', -- pending | approved | rejected
  rejection_reason          text,
  approved_by               text,                   -- admin firebase_uid
  approved_at               timestamptz,

  -- ── TIMESTAMPS ───────────────────────────────────────────────────────────
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ── 3. AUTO-UPDATE updated_at ─────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger doctors_updated_at
  before update on doctors
  for each row execute function update_updated_at();

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table doctors enable row level security;

-- Doctor can insert their own row
create policy "doctor_insert_own" on doctors
  for insert
  with check (true);  -- anon insert allowed (registration flow)

-- Doctor can read their own row
create policy "doctor_select_own" on doctors
  for select
  using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Doctor can update their own row
create policy "doctor_update_own" on doctors
  for update
  using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── 5. STORAGE BUCKETS ────────────────────────────────────────────────────────
-- Run once — safe to re-run (on conflict do nothing)

insert into storage.buckets (id, name, public)
values ('doctor-documents', 'doctor-documents', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('doctor-images', 'doctor-images', true)
on conflict (id) do nothing;

-- Allow anyone to upload (registration is unauthenticated at upload time)
create policy "allow_upload_documents" on storage.objects
  for insert with check (bucket_id = 'doctor-documents');

create policy "allow_upload_images" on storage.objects
  for insert with check (bucket_id = 'doctor-images');

-- Public read for both buckets
create policy "public_read_all" on storage.objects
  for select using (bucket_id in ('doctor-documents', 'doctor-images'));

-- ── 6. USEFUL QUERIES (for reference) ────────────────────────────────────────

-- All pending doctors (admin review queue)
-- select id, full_name, email, specialization, created_at
-- from doctors where status = 'pending' order by created_at desc;

-- Approve a doctor
-- update doctors
-- set status = 'approved', approved_by = '<admin_uid>', approved_at = now()
-- where id = '<doctor_uuid>';

-- Reject a doctor
-- update doctors
-- set status = 'rejected', rejection_reason = 'Documents unclear'
-- where id = '<doctor_uuid>';

-- Get doctor by firebase_uid (used on login to check approval)
-- select status, full_name from doctors where firebase_uid = '<uid>';
