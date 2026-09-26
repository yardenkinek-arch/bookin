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
      style={
        verified
          ? {
              backgroundColor: "#39ff14",
              color: "#08130a",
              boxShadow: "0 0 10px 2px rgba(57,255,20,0.9)",
            }
          : undefined
      }
      className={`absolute top-1.5 left-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-base font-black leading-none shadow transition disabled:opacity-60 ${
        verified
          ? "ring-2 ring-white/70"
          : "bg-black/55 text-white/95 hover:bg-black/75 backdrop-blur"
      }`}
    >
      {verified ? "✓" : "−"}
    </button>
  );
}
