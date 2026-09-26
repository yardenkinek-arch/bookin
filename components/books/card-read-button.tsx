"use client";

import { useState, useTransition } from "react";
import { setReadingStatus } from "@/app/(app)/books/actions";

/**
 * Personal "I read this" toggle on a library card — each user sees and sets
 * their own. Marks the book read/unread without opening it.
 */
export function CardReadButton({ bookId, read }: { bookId: string; read: boolean }) {
  const [isRead, setIsRead] = useState(read);
  const [pending, start] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isRead;
    setIsRead(next);
    start(async () => {
      await setReadingStatus(bookId, next ? "read" : "unread");
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={isRead ? "קראתי — לחצי לביטול" : "סימון שקראתי"}
      aria-label={isRead ? "בטלי סימון קריאה" : "סמני שקראתי"}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-base font-black leading-none shadow transition disabled:opacity-60 ${
        isRead
          ? "bg-primary text-white ring-2 ring-white/60"
          : "bg-black/45 text-white/85 hover:bg-black/65 backdrop-blur"
      }`}
    >
      ✓
    </button>
  );
}
