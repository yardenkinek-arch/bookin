"use client";

import { useTransition } from "react";
import { setFlagStatus } from "./actions";
import { REVIEW_STATUS_LABELS } from "@/lib/labels";
import type { ReviewStatus } from "@/types/database";

const STATUSES: ReviewStatus[] = [
  "new",
  "in_review",
  "resolved",
  "not_problematic",
  "approved",
  "not_suitable",
];

export function FlagStatusControl({
  flagId,
  status,
}: {
  flagId: string;
  status: ReviewStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-soft">סטטוס:</span>
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(() => setFlagStatus(flagId, e.target.value as ReviewStatus))
        }
        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {REVIEW_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
