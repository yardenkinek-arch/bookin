import type { ReadingStatus, ReviewStatus } from "@/types/database";

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: "לא קראתי",
  want_to_read: "רוצה לקרוא",
  reading: "קורא/ת עכשיו",
  read: "קראתי",
  reread: "קראתי שוב",
};

export const READING_STATUS_ICON: Record<ReadingStatus, string> = {
  unread: "📕",
  want_to_read: "🔖",
  reading: "📖",
  read: "✅",
  reread: "🔁",
};

export const READING_STATUS_ORDER: ReadingStatus[] = [
  "unread",
  "want_to_read",
  "reading",
  "read",
  "reread",
];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  new: "חדש",
  in_review: "בבדיקה",
  resolved: "טופל",
  not_problematic: "לא נמצא בעייתי",
  approved: "אושר לקריאה",
  not_suitable: "לא מתאים",
};

export const SHOPPING_PRIORITY_LABELS = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
} as const;
