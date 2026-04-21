-- ============================================================
-- DOCTORS APP - SUPABASE SQL SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── DOCTORS TABLE ─────────────────────────────────────────────────────────────
create table if not exists doctors (
  id                  uuid primary key default uuid_generate_v4(),
  firebase_uid        text unique not null,

  -- Step 1: Basic Info
  full_name           text,
  email               text unique not null,
  city                text,
  state               text,
  gender              text,

  -- Step 2: Identity Verification
  id_type             text,                        -- aadhaar | passport | driving | voter
  id_proof_url        text,                        -- stored in doctor-documents bucket
  selfie_url          text,                        -- stored in doctor-images bucket
  passport_photo_url  text,                        -- stored in doctor-images bucket

  -- Step 3: Medical Credentials
  mbbs_certificate_url    text,
  postgrad_certificate_url text,
  internship_certificate_url text,
  registration_number text,
  council_name        text,
  year_of_registration text,

  -- Step 4: Professional Profile
  specialization      text,
  experience_years    int,
  hospital_name       text,
  languages           text[],
  service_chat        boolean default false,
  service_opd         boolean default false,
  service_home        boolean default false,
  consult_duration    int default 15,

  -- Step 5: Payment Details
  account_holder      text,
  account_number      text,
  ifsc_code           text,
  pan_number          text,
  gst_number          text,
  bank_document_url   text,                        -- stored in doctor-documents bucket

  -- Step 6: Legal Consent
  consent_registered      boolean default false,
  consent_guidelines      boolean default false,
  consent_terms           boolean default false,
  consent_prescriptions   boolean default false,
  consent_data_processing boolean default false,

  -- Status
  status              text default 'pending',      -- pending | under_review | approved | rejected
  rejection_reason    text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger doctors_updated_at
  before update on doctors
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
alter table doctors enable row level security;

-- Doctors can read/update their own record
create policy "doctor_select_own" on doctors
  for select using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "doctor_insert_own" on doctors
  for insert with check (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "doctor_update_own" on doctors
  for update using (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── STORAGE BUCKETS ───────────────────────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage, or via SQL:

insert into storage.buckets (id, name, public)
values ('doctor-documents', 'doctor-documents', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('doctor-images', 'doctor-images', true)
on conflict (id) do nothing;

-- Storage policies: allow authenticated uploads to own folder
create policy "doctor_upload_documents" on storage.objects
  for insert with check (
    bucket_id = 'doctor-documents'
    and auth.role() = 'anon'
  );

create policy "doctor_upload_images" on storage.objects
  for insert with check (
    bucket_id = 'doctor-images'
    and auth.role() = 'anon'
  );

create policy "public_read_documents" on storage.objects
  for select using (bucket_id in ('doctor-documents', 'doctor-images'));

-- ── USEFUL QUERIES ────────────────────────────────────────────────────────────

-- GET all doctors
-- select * from doctors;

-- GET doctor by firebase_uid
-- select * from doctors where firebase_uid = '<uid>';

-- GET doctors by status
-- select * from doctors where status = 'pending';

-- POST (insert) new doctor  →  done via supabase.ts createDoctor()
-- PUT (update) doctor       →  done via supabase.ts updateDoctor()

-- Admin: approve a doctor
-- update doctors set status = 'approved' where id = '<uuid>';

-- Admin: reject a doctor
-- update doctors set status = 'rejected', rejection_reason = 'Invalid credentials' where id = '<uuid>';
