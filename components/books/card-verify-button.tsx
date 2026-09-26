"use client";

import { useState, useTransition } from "react";
import { setBookVerified } from "@/app/(app)/books/actions";

/** Verify toggle rendered on a library card. Stops the card's link navigation. */
export function CardVerifyButton({
  bookId,
  verifiedAt,
}: {
  bookId: string;
  verifiedAt: string | null;
}) {
  const [verified, setVerified] = useState(!!verifiedAt);
  const [pending, start] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !verified;
    setVerified(next);
    start(async () => {
      await setBookVerified(bookId, next);
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={verified ? "אומת — לחצי לביטול" : "סמני כמאומת"}
      aria-label={verified ? "בטלי אימות" : "סמני כמאומת"}
      className={`absolute top-1.5 left-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow transition disabled:opacity-60 ${
        verified
          ? "bg-primary text-white"
          : "bg-black/45 text-white/90 hover:bg-black/65 backdrop-blur"
      }`}
    >
      ✓
    </button>
  );
}
