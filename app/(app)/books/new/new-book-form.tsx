"use client";

import { useState, useTransition } from "react";
import { lookupIsbnAction, createBook, type CreateBookInput } from "./actions";
import { Cover } from "@/components/books/cover";

const EMPTY: CreateBookInput = { title: "" };

export function NewBookForm() {
  const [isbn, setIsbn] = useState("");
  const [form, setForm] = useState<CreateBookInput>(EMPTY);
  const [dup, setDup] = useState<{ id: string; title: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();

  const set = (k: keyof CreateBookInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const search = () => {
    setNotFound(false);
    setDup(null);
    setError(null);
    startSearch(async () => {
      const res = await lookupIsbnAction(isbn);
      if (res.status === "not_found") {
        setNotFound(true);
        return;
      }
      const b = res.book!;
      setForm({
        title: b.title,
        title_original: b.title_original ?? "",
        authors: b.authors.join(", "),
        isbn_13: b.isbn_13 ?? "",
        isbn_10: b.isbn_10 ?? "",
        publisher: b.publisher ?? "",
        published_year: b.published_year?.toString() ?? "",
        page_count: b.page_count?.toString() ?? "",
        language: b.language ?? "",
        description: b.description ?? "",
        cover_url: b.cover_url ?? "",
        series_name: b.series_name ?? "",
        series_position: b.series_position?.toString() ?? "",
        source: b.source,
      });
      setDup(res.duplicate ?? null);
    });
  };

  const submit = () => {
    setError(null);
    if (!form.title.trim()) {
      setError("יש להזין לפחות שם ספר.");
      return;
    }
    startSave(async () => {
      const res = await createBook(form);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-5">
      {/* ISBN lookup */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-ink-soft mb-1.5">
          חיפוש לפי ISBN
        </label>
        <div className="flex gap-2">
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="978…"
            dir="ltr"
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
          />
          <button
            onClick={search}
            disabled={searching || isbn.trim().length < 10}
            className="rounded-lg bg-secondary text-white px-4 py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {searching ? "מחפש…" : "חיפוש"}
          </button>
        </div>
        {notFound && (
          <p className="mt-2 text-sm text-ink-soft">
            לא נמצא מידע ודאי ל-ISBN הזה. אפשר למלא ידנית למטה.
          </p>
        )}
        {dup && (
          <p className="mt-2 text-sm text-danger bg-primary-soft rounded-lg px-3 py-2">
            🔴 הספר כבר נמצא בספרייה:{" "}
            <a href={`/books/${dup.id}`} className="underline font-medium">
              {dup.title}
            </a>
          </p>
        )}
      </div>

      {/* Preview + fields */}
      <div className="flex gap-4">
        {form.cover_url && (
          <div className="w-24 shrink-0 aspect-[2/3] rounded-lg overflow-hidden card">
            <Cover url={form.cover_url} title={form.title} />
          </div>
        )}
        <div className="flex-1 space-y-3">
          <Text label="שם הספר *" value={form.title} onChange={set("title")} />
          <Text
            label="שם בשפת המקור"
            value={form.title_original ?? ""}
            onChange={set("title_original")}
          />
          <Text
            label="סופר/ים (מופרד בפסיקים)"
            value={form.authors ?? ""}
            onChange={set("authors")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Text label="הוצאה" value={form.publisher ?? ""} onChange={set("publisher")} />
        <Text label="שנת פרסום" value={form.published_year ?? ""} onChange={set("published_year")} />
        <Text label="מספר עמודים" value={form.page_count ?? ""} onChange={set("page_count")} />
        <Text label="שפה" value={form.language ?? ""} onChange={set("language")} />
        <Text label="ISBN-13" value={form.isbn_13 ?? ""} onChange={set("isbn_13")} dir="ltr" />
        <Text label="ISBN-10" value={form.isbn_10 ?? ""} onChange={set("isbn_10")} dir="ltr" />
        <Text label="שם הסדרה" value={form.series_name ?? ""} onChange={set("series_name")} />
        <Text label="מספר בסדרה" value={form.series_position ?? ""} onChange={set("series_position")} />
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-soft mb-1.5">תקציר</span>
        <textarea
          value={form.description ?? ""}
          onChange={set("description")}
          rows={4}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-primary resize-none"
        />
      </label>

      {error && (
        <p className="text-sm text-danger bg-primary-soft rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={saving}
        className="w-full rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold py-3 transition disabled:opacity-60"
      >
        {saving ? "שומר…" : "הוספת הספר לספרייה"}
      </button>
    </div>
  );
}

function Text({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}
