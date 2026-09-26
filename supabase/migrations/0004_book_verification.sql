-- Admin book verification: mark which books the admin has reviewed for correctness.
-- Run once in the Supabase SQL editor.
alter table books add column if not exists verified_at timestamptz;
alter table books add column if not exists verified_by uuid references profiles(id);
