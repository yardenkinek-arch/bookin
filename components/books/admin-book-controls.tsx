"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setBookVerified } from "@/app/(app)/books/actions";

/** Admin-only: edit link + "reviewed/verified" toggle for a book. */
export function AdminBookControls({
  bookId,
  verifiedAt,
}: {
  bookId: string;
  verifiedAt: string | null;
}) {
  const [verified, setVerified] = useState(!!verifiedAt);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !verified;
    setVerified(next);
    start(async () => {
      await setBookVerified(bookId, next);
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
      <h2 className="text-sm font-semibold text-ink mb-3">ניהול (למנהלת בלבד)</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/books/${bookId}/edit`}
          className="rounded-lg bg-primary hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 transition"
        >
          ✏️ עריכת פרטי הספר
        </Link>
        <button
          onClick={toggle}
          disabled={pending}
          className={`rounded-lg text-sm font-semibold px-4 py-2 transition disabled:opacity-60 ${
            verified
              ? "bg-primary-soft text-primary border border-primary"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          {verified ? "✓ עברתי ואימתתי" : "סמני כמאומת"}
        </button>
      </div>
      {verified && (
        <p className="mt-2 text-xs text-ink-soft">
          הספר סומן כמאומת. לחיצה נוספת מבטלת את הסימון.
        </p>
      )}
    </section>
  );
}
