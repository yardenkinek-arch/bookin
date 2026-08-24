-- ============================================================================
-- Family Library — Initial Schema
-- PostgreSQL / Supabase
-- ============================================================================
-- Design principles:
--   * The BOOK is shared. Reading status / rating / tags / notes are PERSONAL.
--   * "Review flags" (טעון עיון) + their notes are PRIVATE to admin only,
--     enforced by Row Level Security at the database — not just hidden in UI.
--   * Every enriched field keeps source / confidence / last_updated.
--   * Soft delete everywhere important (archive, never hard-delete easily).
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy / Hebrew+English search

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------
create type user_role        as enum ('admin', 'member');
create type reading_status   as enum ('unread', 'want_to_read', 'reading', 'read', 'reread');
create type shopping_priority as enum ('low', 'normal', 'high');
create type review_status    as enum ('new', 'in_review', 'resolved', 'not_problematic', 'approved', 'not_suitable');
create type metadata_source  as enum ('manual', 'google_books', 'open_library', 'import_ocr', 'other');
create type confidence_level as enum ('low', 'medium', 'high', 'confirmed');

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role         user_role not null default 'member',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- helper: is the current user an admin?  (SECURITY DEFINER avoids RLS recursion)
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- AUTHORS
-- ---------------------------------------------------------------------------
create table authors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,              -- display name (he or en)
  name_original  text,                       -- original-language name
  bio            text,
  photo_url      text,
  source         metadata_source not null default 'manual',
  metadata_updated_at timestamptz,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- SERIES
-- ---------------------------------------------------------------------------
create table series (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_original text,
  description  text,
  total_books  int,                          -- known total (nullable = unknown)
  source       metadata_source not null default 'manual',
  confidence   confidence_level not null default 'medium',
  metadata_updated_at timestamptz,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- GENRES  (with sub-genre hierarchy)
-- ---------------------------------------------------------------------------
create table genres (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  parent_id  uuid references genres(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BOOKS  (the shared resource)
-- ---------------------------------------------------------------------------
create table books (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  title_original     text,
  subtitle           text,
  isbn_10            text,
  isbn_13            text,
  publisher          text,
  published_year     int,
  published_date     date,
  language           text default 'he',       -- ISO 639-1
  page_count         int,
  format             text,                     -- hardcover / paperback / ebook ...
  description        text,
  cover_url          text,
  -- series linkage (nullable — a book may be standalone)
  series_id          uuid references series(id) on delete set null,
  series_position    numeric(6,2),             -- supports 0, 0.5 (prequel/novella)
  series_kind        text,                     -- 'main' | 'prequel' | 'novella' | 'short_story' | 'companion'
  publication_order  int,                      -- when different from reading order
  reading_order      int,
  -- provenance
  source             metadata_source not null default 'manual',
  source_confidence  confidence_level not null default 'medium',
  series_confidence  confidence_level,         -- separate: series guesses are uncertain
  metadata_updated_at timestamptz,
  -- housekeeping
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz               -- soft delete / archive
);

create index books_title_trgm    on books using gin (title gin_trgm_ops);
create index books_title_orig_trgm on books using gin (coalesce(title_original,'') gin_trgm_ops);
create index books_isbn13_idx     on books (isbn_13) where isbn_13 is not null;
create index books_isbn10_idx     on books (isbn_10) where isbn_10 is not null;
create index books_series_idx     on books (series_id);
create index books_not_deleted    on books (id) where deleted_at is null;

-- book <-> authors (many-to-many, ordered)
create table book_authors (
  book_id   uuid references books(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  position  int not null default 0,           -- 0 = primary author
  primary key (book_id, author_id)
);

-- book <-> genres (many-to-many)
create table book_genres (
  book_id  uuid references books(id) on delete cascade,
  genre_id uuid references genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

-- editions: same work, different physical/language editions
create table book_editions (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid references books(id) on delete cascade,  -- canonical book
  isbn_13       text,
  isbn_10       text,
  language      text,
  format        text,
  publisher     text,
  cover_url     text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PERSONAL: reading status / rating / tags / notes / favorites (per user)
-- ---------------------------------------------------------------------------
create table user_book_status (
  user_id     uuid references profiles(id) on delete cascade,
  book_id     uuid references books(id) on delete cascade,
  status      reading_status not null default 'unread',
  date_read   date,
  updated_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table user_book_ratings (
  user_id   uuid references profiles(id) on delete cascade,
  book_id   uuid references books(id) on delete cascade,
  rating    int not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table user_book_tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references profiles(id) on delete cascade,
  book_id  uuid references books(id) on delete cascade,
  tag      text not null,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, tag)
);

create table user_notes (               -- personal, NON-private notes
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references profiles(id) on delete cascade,
  book_id  uuid references books(id) on delete cascade,
  body     text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table favorites (
  user_id  uuid references profiles(id) on delete cascade,
  book_id  uuid references books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table authors_following (
  user_id   uuid references profiles(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

-- ---------------------------------------------------------------------------
-- PRIVATE  (admin-only):  review flags + notes  🔒
-- ---------------------------------------------------------------------------
create table review_flags (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid references books(id) on delete cascade,
  reported_by  uuid references profiles(id),   -- hidden from non-admins
  page         int,
  status       review_status not null default 'new',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references profiles(id)
);

create table review_notes (
  id         uuid primary key default gen_random_uuid(),
  flag_id    uuid references review_flags(id) on delete cascade,
  body       text not null,                    -- the private note content
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SHOPPING LIST
-- ---------------------------------------------------------------------------
create table shopping_list (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references books(id) on delete set null,   -- may reference a known book
  title       text,                            -- free text if not yet a book
  author_name text,
  isbn        text,
  added_by    uuid references profiles(id),
  priority    shopping_priority not null default 'normal',
  note        text,
  purchased   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,   -- recipient
  type       text not null,                    -- 'review_flag' | 'book_added' | 'series_new' ...
  title      text not null,
  body       text,
  link       text,                             -- deep link (e.g. /books/:id)
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PURCHASE HISTORY (optional per book)
-- ---------------------------------------------------------------------------
create table purchase_history (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid references books(id) on delete cascade,
  purchase_date date,
  price        numeric(10,2),
  currency     text default 'ILS',
  store        text,
  condition    text,                            -- 'new' | 'used'
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG (admin actions)
-- ---------------------------------------------------------------------------
create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id),
  action     text not null,                    -- 'book.create' | 'book.delete' | 'flag.resolve' ...
  entity     text not null,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FUTURE-READY (image import) — created now, unused until phase 2
-- ---------------------------------------------------------------------------
create table import_jobs (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references profiles(id),
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

create table import_candidates (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references import_jobs(id) on delete cascade,
  image_url   text,
  ocr_text    text,
  matched_book jsonb,                           -- proposed metadata
  confidence  confidence_level,
  approved    boolean,
  created_at  timestamptz not null default now()
);
