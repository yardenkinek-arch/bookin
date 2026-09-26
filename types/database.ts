// ============================================================================
// Hand-written DB types mirroring supabase/migrations.
// Regenerate later with: supabase gen types typescript --local > types/database.ts
// ============================================================================

export type UserRole = "admin" | "member";
export type ReadingStatus =
  | "unread"
  | "want_to_read"
  | "reading"
  | "read"
  | "reread";
export type ShoppingPriority = "low" | "normal" | "high";
export type ReviewStatus =
  | "new"
  | "in_review"
  | "resolved"
  | "not_problematic"
  | "approved"
  | "not_suitable";
export type MetadataSource =
  | "manual"
  | "google_books"
  | "open_library"
  | "import_ocr"
  | "other";
export type ConfidenceLevel = "low" | "medium" | "high" | "confirmed";

export type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Author = {
  id: string;
  name: string;
  name_original: string | null;
  bio: string | null;
  photo_url: string | null;
  source: MetadataSource;
  metadata_updated_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type Series = {
  id: string;
  name: string;
  name_original: string | null;
  description: string | null;
  total_books: number | null;
  source: MetadataSource;
  confidence: ConfidenceLevel;
  metadata_updated_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type Genre = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export type Book = {
  id: string;
  title: string;
  title_original: string | null;
  subtitle: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  publisher: string | null;
  published_year: number | null;
  published_date: string | null;
  language: string | null;
  page_count: number | null;
  format: string | null;
  description: string | null;
  cover_url: string | null;
  series_id: string | null;
  series_position: number | null;
  series_kind: string | null;
  publication_order: number | null;
  reading_order: number | null;
  source: MetadataSource;
  source_confidence: ConfidenceLevel;
  series_confidence: ConfidenceLevel | null;
  metadata_updated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Admin verification: set when the admin has reviewed the record for correctness.
  verified_at: string | null;
  verified_by: string | null;
}

export type UserBookStatus = {
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  date_read: string | null;
  updated_at: string;
}

export type UserBookRating = {
  user_id: string;
  book_id: string;
  rating: number;
  updated_at: string;
}

export type UserBookTag = {
  id: string;
  user_id: string;
  book_id: string;
  tag: string;
  created_at: string;
}

export type UserNote = {
  id: string;
  user_id: string;
  book_id: string;
  body: string;
  updated_at: string;
  created_at: string;
}

export type Favorite = {
  user_id: string;
  book_id: string;
  created_at: string;
}

export type ReviewFlag = {
  id: string;
  book_id: string;
  reported_by: string | null;
  page: number | null;
  status: ReviewStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export type ReviewNote = {
  id: string;
  flag_id: string;
  body: string;
  created_at: string;
}

export type ShoppingListItem = {
  id: string;
  book_id: string | null;
  title: string | null;
  author_name: string | null;
  isbn: string | null;
  added_by: string | null;
  priority: ShoppingPriority;
  note: string | null;
  purchased: boolean;
  created_at: string;
}

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Generic table helper so the Supabase client is typed without full boilerplate.
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      authors: Table<Author>;
      series: Table<Series>;
      genres: Table<Genre>;
      books: Table<Book>;
      book_authors: Table<{ book_id: string; author_id: string; position: number }>;
      book_genres: Table<{ book_id: string; genre_id: string }>;
      user_book_status: Table<UserBookStatus>;
      user_book_ratings: Table<UserBookRating>;
      user_book_tags: Table<UserBookTag>;
      user_notes: Table<UserNote>;
      favorites: Table<Favorite>;
      authors_following: Table<{ user_id: string; author_id: string; created_at: string }>;
      review_flags: Table<ReviewFlag>;
      review_notes: Table<ReviewNote>;
      shopping_list: Table<ShoppingListItem>;
      notifications: Table<Notification>;
      audit_logs: Table<{
        id: string;
        actor_id: string | null;
        action: string;
        entity: string;
        entity_id: string | null;
        details: unknown;
        created_at: string;
      }>;
      purchase_history: Table<{
        id: string;
        book_id: string;
        purchase_date: string | null;
        price: number | null;
        currency: string | null;
        store: string | null;
        condition: string | null;
        created_at: string;
      }>;
      book_editions: Table<{
        id: string;
        book_id: string;
        isbn_13: string | null;
        isbn_10: string | null;
        language: string | null;
        format: string | null;
        publisher: string | null;
        cover_url: string | null;
        created_at: string;
      }>;
      import_jobs: Table<{
        id: string;
        created_by: string | null;
        status: string;
        created_at: string;
      }>;
      import_candidates: Table<{
        id: string;
        job_id: string;
        image_url: string | null;
        ocr_text: string | null;
        matched_book: unknown;
        confidence: ConfidenceLevel | null;
        approved: boolean | null;
        created_at: string;
      }>;
    };
    // NOTE: `{ [_ in never]: never }` is an empty object type WITHOUT an index
    // signature. Using `Record<string, never>` here carries a `[string]: never`
    // index signature which, when Supabase computes `Tables & Views`, collapses
    // every table Row to `never`.
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      reading_status: ReadingStatus;
      shopping_priority: ShoppingPriority;
      review_status: ReviewStatus;
      metadata_source: MetadataSource;
      confidence_level: ConfidenceLevel;
    };
  };
}
