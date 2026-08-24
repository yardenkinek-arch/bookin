"use client";

import { useState, useTransition } from "react";
import {
  setReadingStatus,
  setRating,
  toggleFavorite,
  addTag,
  removeTag,
  saveNote,
} from "@/app/(app)/books/actions";
import { READING_STATUS_LABELS, READING_STATUS_ORDER } from "@/lib/labels";
import type { ReadingStatus } from "@/types/database";

// --- Reading status segmented control ---------------------------------------
export function StatusPicker({
  bookId,
  current,
}: {
  bookId: string;
  current: ReadingStatus | null;
}) {
  const [status, setStatus] = useState<ReadingStatus>(current ?? "unread");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {READING_STATUS_ORDER.map((s) => (
        <button
          key={s}
          disabled={pending}
          onClick={() => {
            setStatus(s);
            start(() => setReadingStatus(bookId, s));
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
            status === s
              ? "bg-primary text-white"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          {READING_STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

// --- Star rating -------------------------------------------------------------
export function StarRating({
  bookId,
  current,
}: {
  bookId: string;
  current: number | null;
}) {
  const [rating, setLocal] = useState(current ?? 0);
  const [hover, setHover] = useState(0);
  const [, start] = useTransition();

  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => {
            setLocal(n);
            start(() => setRating(bookId, n));
          }}
          className="text-2xl leading-none transition-transform hover:scale-110"
          aria-label={`${n} כוכבים`}
        >
          <span className={(hover || rating) >= n ? "text-amber" : "text-line"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

// --- Favorite ----------------------------------------------------------------
export function FavoriteButton({
  bookId,
  current,
}: {
  bookId: string;
  current: boolean;
}) {
  const [fav, setFav] = useState(current);
  const [, start] = useTransition();
  return (
    <button
      onClick={() => {
        const next = !fav;
        setFav(next);
        start(() => toggleFavorite(bookId, next));
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2 transition"
    >
      <span>{fav ? "❤️" : "🤍"}</span>
      {fav ? "במועדפים" : "הוסף למועדפים"}
    </button>
  );
}

// --- Personal tags -----------------------------------------------------------
const TAG_SUGGESTIONS = [
  "ממש אהבתי",
  "לא אהבתי",
  "מרגש",
  "מצחיק",
  "כבד",
  "קליל",
  "מפחיד",
  "לחופשה",
  "לקרוא שוב",
  "מומלץ",
];

export function TagEditor({
  bookId,
  tags,
}: {
  bookId: string;
  tags: { id: string; tag: string }[];
}) {
  const [value, setValue] = useState("");
  const [, start] = useTransition();
  const existing = new Set(tags.map((t) => t.tag));

  const add = (t: string) => {
    if (!t.trim() || existing.has(t.trim())) return;
    start(() => addTag(bookId, t));
    setValue("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full bg-secondary-soft text-secondary text-xs font-medium px-2.5 py-1"
          >
            {t.tag}
            <button
              onClick={() => start(() => removeTag(t.id, bookId))}
              className="hover:text-danger"
              aria-label="הסר תגית"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-ink-soft">אין תגיות עדיין</span>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(value);
        }}
        className="flex gap-2 mb-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="תגית חדשה…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium hover:bg-line transition"
        >
          הוסף
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {TAG_SUGGESTIONS.filter((t) => !existing.has(t)).map((t) => (
          <button
            key={t}
            onClick={() => add(t)}
            className="rounded-full border border-dashed border-line text-ink-soft text-xs px-2.5 py-1 hover:border-secondary hover:text-secondary transition"
          >
            + {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Personal note -----------------------------------------------------------
export function NoteEditor({
  bookId,
  initial,
}: {
  bookId: string;
  initial: string;
}) {
  const [body, setBody] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="הערה אישית על הספר…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary resize-none"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveNote(bookId, body);
              setSaved(true);
            })
          }
          className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-line transition disabled:opacity-60"
        >
          {pending ? "שומר…" : "שמירה"}
        </button>
        {saved && <span className="text-xs text-success">נשמר ✓</span>}
      </div>
    </div>
  );
}
