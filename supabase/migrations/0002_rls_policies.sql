-- ============================================================================
-- Row Level Security policies
-- ============================================================================
-- The security model in one line:
--   READ the shared library = everyone signed in.
--   WRITE the shared library = admin only.
--   PERSONAL rows = each user only their own (admin may read all).
--   PRIVATE review flags/notes = admin only, even for SELECT.  🔒
-- ============================================================================

-- Enable RLS on every table
alter table profiles           enable row level security;
alter table authors            enable row level security;
alter table series             enable row level security;
alter table genres             enable row level security;
alter table books              enable row level security;
alter table book_authors       enable row level security;
alter table book_genres        enable row level security;
alter table book_editions      enable row level security;
alter table user_book_status   enable row level security;
alter table user_book_ratings  enable row level security;
alter table user_book_tags     enable row level security;
alter table user_notes         enable row level security;
alter table favorites          enable row level security;
alter table authors_following  enable row level security;
alter table review_flags       enable row level security;
alter table review_notes       enable row level security;
alter table shopping_list      enable row level security;
alter table notifications      enable row level security;
alter table purchase_history   enable row level security;
alter table audit_logs         enable row level security;
alter table import_jobs        enable row level security;
alter table import_candidates  enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES: everyone signed in can read all profiles (needed for "who read
-- what"). A user updates only their own row. Admin manages all.
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles
  for select using (auth.role() = 'authenticated');
create policy profiles_update_self on profiles
  for update using (id = auth.uid());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- SHARED LIBRARY tables: read = authenticated; write = admin only.
-- ---------------------------------------------------------------------------
-- macro applied to: authors, series, genres, books,
--                   book_authors, book_genres, book_editions
do $$
declare t text;
begin
  foreach t in array array[
    'authors','series','genres','books',
    'book_authors','book_genres','book_editions'
  ] loop
    execute format(
      'create policy %I_read on %I for select using (auth.role() = ''authenticated'');',
      t, t);
    execute format(
      'create policy %I_admin_write on %I for all using (is_admin()) with check (is_admin());',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- PRIVATE-PERSONAL tables: rating / tags / notes / favorites / following.
-- A user manages only their own rows; the ADMIN may read everyone's (to get
-- the full family picture). Members cannot see each other's rows.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'user_book_ratings','user_book_tags',
    'user_notes','favorites','authors_following'
  ] loop
    -- owner: full control over own rows
    execute format(
      'create policy %I_owner on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t, t);
    -- admin: read-only visibility into everyone's rows
    execute format(
      'create policy %I_admin_read on %I for select using (is_admin());',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- READING STATUS is SHARED family info: everyone signed in may SEE who read
-- what (the "מי קרא" matrix, spec §57), but may only WRITE their own row.
-- ---------------------------------------------------------------------------
create policy ubs_read_all on user_book_status
  for select using (auth.role() = 'authenticated');
create policy ubs_insert_own on user_book_status
  for insert with check (user_id = auth.uid());
create policy ubs_update_own on user_book_status
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ubs_delete_own on user_book_status
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PRIVATE — review_flags 🔒
--   INSERT: any authenticated user may file a report (as themselves).
--   SELECT/UPDATE/DELETE: admin only. Members can NEVER read flags back —
--   not the reporter, page, status, or who filed it.
-- ---------------------------------------------------------------------------
create policy review_flags_insert on review_flags
  for insert with check (reported_by = auth.uid());
create policy review_flags_admin_read on review_flags
  for select using (is_admin());
create policy review_flags_admin_write on review_flags
  for update using (is_admin()) with check (is_admin());
create policy review_flags_admin_delete on review_flags
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- PRIVATE — review_notes 🔒
--   INSERT: authenticated (the note is written together with the flag).
--   SELECT/UPDATE/DELETE: admin only.
-- ---------------------------------------------------------------------------
create policy review_notes_insert on review_notes
  for insert with check (auth.role() = 'authenticated');
create policy review_notes_admin_read on review_notes
  for select using (is_admin());
create policy review_notes_admin_write on review_notes
  for update using (is_admin()) with check (is_admin());
create policy review_notes_admin_delete on review_notes
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- SHOPPING LIST: everyone reads; members may add; admin manages.
-- ---------------------------------------------------------------------------
create policy shopping_select on shopping_list
  for select using (auth.role() = 'authenticated');
create policy shopping_insert on shopping_list
  for insert with check (added_by = auth.uid());
create policy shopping_admin_write on shopping_list
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS: recipient sees & updates only their own.
-- ---------------------------------------------------------------------------
create policy notifications_own on notifications
  for select using (user_id = auth.uid());
create policy notifications_own_update on notifications
  for update using (user_id = auth.uid());
-- inserts happen from trusted server context (service role bypasses RLS)

-- ---------------------------------------------------------------------------
-- PURCHASE HISTORY: read authenticated; write admin.
-- ---------------------------------------------------------------------------
create policy purchase_read on purchase_history
  for select using (auth.role() = 'authenticated');
create policy purchase_admin_write on purchase_history
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- AUDIT LOGS + IMPORT: admin only.
-- ---------------------------------------------------------------------------
create policy audit_admin on audit_logs
  for select using (is_admin());
create policy import_jobs_admin on import_jobs
  for all using (is_admin()) with check (is_admin());
create policy import_candidates_admin on import_candidates
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'member'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
