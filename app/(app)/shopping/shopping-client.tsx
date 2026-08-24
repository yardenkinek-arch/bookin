"use client";

import { useState, useTransition } from "react";
import {
  addShoppingItem,
  checkDuplicate,
  markPurchased,
  removeShoppingItem,
  type DuplicateCheck,
} from "./actions";
import { SHOPPING_PRIORITY_LABELS } from "@/lib/labels";
import type { ShoppingPriority } from "@/types/database";

export function AddShoppingForm() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [priority, setPriority] = useState<ShoppingPriority>("normal");
  const [dup, setDup] = useState<DuplicateCheck>({ level: "none" });
  const [pending, start] = useTransition();

  const onTitleBlur = () => {
    if (!title.trim()) return setDup({ level: "none" });
    start(async () => setDup(await checkDuplicate(title)));
  };

  const submit = () => {
    if (!title.trim()) return;
    start(async () => {
      const res = await addShoppingItem({
        title,
        authorName: author,
        priority,
      });
      if (res?.ok) {
        setTitle("");
        setAuthor("");
        setPriority("normal");
        setDup({ level: "none" });
      }
    });
  };

  return (
    <div className="card p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={onTitleBlur}
        placeholder="שם הספר…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
      />
      {dup.level === "owned" && (
        <p className="text-sm text-danger bg-primary-soft rounded-lg px-3 py-2">
          🔴 הספר כבר נמצא בספרייה.
        </p>
      )}
      {dup.level === "same_title" && (
        <p className="text-sm bg-amber/10 text-ink rounded-lg px-3 py-2">
          🟡 קיים אצלכם ספר בשם זהה. ייתכן שזו מהדורה אחרת.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="סופר (לא חובה)"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as ShoppingPriority)}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
        >
          {(
            Object.keys(SHOPPING_PRIORITY_LABELS) as ShoppingPriority[]
          ).map((p) => (
            <option key={p} value={p}>
              {SHOPPING_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={submit}
        disabled={pending || !title.trim()}
        className="w-full rounded-lg bg-primary hover:bg-primary-600 text-white font-semibold py-2.5 transition disabled:opacity-60"
      >
        {pending ? "רגע…" : "הוספה לרשימה"}
      </button>
    </div>
  );
}

const PRIORITY_STYLE: Record<ShoppingPriority, string> = {
  high: "border-r-4 border-danger",
  normal: "border-r-4 border-secondary",
  low: "border-r-4 border-line",
};

export function ShoppingItemRow({
  item,
  isAdmin,
}: {
  item: {
    id: string;
    title: string | null;
    author_name: string | null;
    priority: ShoppingPriority;
    note: string | null;
    purchased: boolean;
    added_by: { display_name: string } | null;
  };
  isAdmin: boolean;
}) {
  const [, start] = useTransition();
  return (
    <div className={`card p-3 flex items-center gap-3 ${PRIORITY_STYLE[item.priority]}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">{item.title}</p>
        <p className="text-xs text-ink-soft truncate">
          {item.author_name && `${item.author_name} · `}
          הוסיף/ה {item.added_by?.display_name ?? "?"} ·{" "}
          {SHOPPING_PRIORITY_LABELS[item.priority]}
        </p>
        {item.note && <p className="text-xs text-ink-soft mt-0.5">{item.note}</p>}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => start(() => markPurchased(item.id, !item.purchased))}
            className="rounded-md px-2 py-1 text-sm hover:bg-surface-2 transition"
            title={item.purchased ? "החזר לרשימה" : "סמן כנקנה"}
          >
            {item.purchased ? "↩️" : "✔️"}
          </button>
          <button
            onClick={() => start(() => removeShoppingItem(item.id))}
            className="rounded-md px-2 py-1 text-sm hover:bg-surface-2 transition text-danger"
            title="הסר"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
