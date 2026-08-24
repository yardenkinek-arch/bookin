"use client";

import { useState, useTransition } from "react";
import { createReviewFlag } from "@/app/(app)/books/actions";

/**
 * "טעון עיון" reporter — available to every family member.
 * The content is submitted privately; it is visible ONLY to the admin
 * (enforced by DB Row Level Security, not just here in the UI).
 */
export function ReviewFlagButton({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await createReviewFlag(
        bookId,
        page ? parseInt(page, 10) : null,
        note,
      );
      if (res?.error) setError(res.error);
      else {
        setDone(true);
        setNote("");
        setPage("");
      }
    });
  };

  return (
    <div className="rounded-xl border border-warn/40 bg-amber/5 p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-ink">סימון ספר כ"טעון עיון"</h3>
          <p className="text-xs text-ink-soft mt-0.5">
            הדיווח נשלח באופן פרטי למנהלת בלבד. אף אחד אחר לא יראה אותו.
          </p>

          {done ? (
            <p className="mt-3 text-sm text-success bg-secondary-soft rounded-lg px-3 py-2">
              הדיווח נשלח למנהלת. תודה ✓
            </p>
          ) : !open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 rounded-lg border border-warn/50 text-ink px-3 py-2 text-sm font-medium hover:bg-amber/10 transition"
            >
              סמן ספר זה לעיון
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <input
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, ""))}
                placeholder="מספר עמוד (לא חובה)"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="מה כדאי לבדוק בספר הזה?"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary resize-none"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={submit}
                  className="rounded-lg bg-primary hover:bg-primary-600 text-white px-3 py-2 text-sm font-semibold transition disabled:opacity-60"
                >
                  {pending ? "שולח…" : "שליחת דיווח פרטי"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:text-ink"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
