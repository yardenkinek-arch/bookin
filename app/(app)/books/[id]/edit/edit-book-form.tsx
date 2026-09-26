"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookDetails, uploadBookCover, type EditBookInput } from "./actions";
import { Cover } from "@/components/books/cover";

function processFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const max = 1200;
        let { width, height } = img;
        if (width > max || height > max) {
          const s = max / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function EditBookForm({ id, initial }: { id: string; initial: EditBookInput }) {
  const router = useRouter();
  const [form, setForm] = useState<EditBookInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedCover, setSavedCover] = useState(false);
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();

  const set = (k: keyof EditBookInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSavedCover(false);
    try {
      const dataUrl = await processFile(file);
      startUpload(async () => {
        const res = await uploadBookCover(id, dataUrl);
        if (res.error) setError(res.error);
        else if (res.url) {
          setForm((f) => ({ ...f, cover_url: res.url }));
          setSavedCover(true);
        }
      });
    } catch {
      setError("בעיה בטעינת התמונה.");
    }
  };

  const save = () => {
    setError(null);
    if (!form.title.trim()) {
      setError("שם הספר חובה.");
      return;
    }
    startSave(async () => {
      const res = await updateBookDetails(id, form);
      if (res.error) setError(res.error);
      else router.push(`/books/${id}`);
    });
  };

  return (
    <div className="space-y-5">
      {/* Cover */}
      <div className="flex gap-4">
        <div className="w-24 shrink-0 aspect-[2/3] rounded-lg overflow-hidden card">
          <Cover url={form.cover_url || null} title={form.title} />
        </div>
        <div className="flex-1 space-y-2">
          <span className="block text-sm font-medium text-ink-soft">כריכה</span>
          <label className="inline-block">
            <span className="inline-block rounded-lg bg-secondary text-white px-4 py-2 text-sm font-semibold cursor-pointer hover:opacity-90">
              {uploading ? "מעלה…" : "החלפת כריכה"}
            </span>
            <input type="file" accept="image/*" onChange={onCover} className="hidden" />
          </label>
          {savedCover && <p className="text-xs text-primary">הכריכה הוחלפה ונשמרה ✓</p>}
          <input
            value={form.cover_url ?? ""}
            onChange={set("cover_url")}
            placeholder="או הדביקי כתובת תמונה…"
            dir="ltr"
            className="w-full text-xs rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-primary"
          />
        </div>
      </div>

      <Field label="שם הספר *" value={form.title} onChange={set("title")} />
      <Field label="שם בשפת המקור" value={form.title_original ?? ""} onChange={set("title_original")} />
      <Field label="סופר/ים (מופרד בפסיקים)" value={form.authors ?? ""} onChange={set("authors")} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="שם הסדרה" value={form.series_name ?? ""} onChange={set("series_name")} />
        <Field label="מספר בסדרה" value={form.series_position ?? ""} onChange={set("series_position")} />
        <Field label="הוצאה" value={form.publisher ?? ""} onChange={set("publisher")} />
        <Field label="שנת פרסום" value={form.published_year ?? ""} onChange={set("published_year")} />
        <Field label="עמודים" value={form.page_count ?? ""} onChange={set("page_count")} />
        <Field label="שפה" value={form.language ?? ""} onChange={set("language")} />
        <Field label="ISBN-13" value={form.isbn_13 ?? ""} onChange={set("isbn_13")} dir="ltr" />
        <Field label="ISBN-10" value={form.isbn_10 ?? ""} onChange={set("isbn_10")} dir="ltr" />
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-soft mb-1.5">תקציר</span>
        <textarea
          value={form.description ?? ""}
          onChange={set("description")}
          rows={5}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-primary resize-y"
        />
      </label>

      {error && (
        <p className="text-sm text-danger bg-primary-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold py-3 transition disabled:opacity-60"
        >
          {saving ? "שומר…" : "שמירת השינויים"}
        </button>
        <button
          onClick={() => router.push(`/books/${id}`)}
          className="rounded-xl border border-line bg-surface px-5 py-3 font-semibold text-ink-soft hover:text-ink transition"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-soft mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}
