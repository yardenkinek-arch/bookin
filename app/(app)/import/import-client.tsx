"use client";

import { useState, useTransition } from "react";
import {
  uploadInboxAction,
  listInboxAction,
  clearInboxAction,
  type InboxItem,
} from "./actions";

/** Downscale an image file to <=1600px JPEG and return base64 (no data-URL prefix). */
function processFile(file: File): Promise<{ data: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const max = 1600;
        let { width, height } = img;
        if (width > max || height > max) {
          const scale = max / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ data: dataUrl.split(",")[1], preview: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImportClient({ initialInbox }: { initialInbox: InboxItem[] }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [payload, setPayload] = useState<{ data: string; mediaType: string }[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>(initialInbox);
  const [msg, setMsg] = useState<{ kind: "error" | "ok" | "info"; text: string } | null>(null);
  const [uploading, startUpload] = useTransition();
  const [clearing, startClear] = useTransition();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMsg(null);
    try {
      const processed = await Promise.all(files.map(processFile));
      setPreviews(processed.map((p) => p.preview));
      setPayload(processed.map((p) => ({ data: p.data, mediaType: "image/jpeg" })));
    } catch {
      setMsg({ kind: "error", text: "בעיה בטעינת התמונות. נסי שוב." });
    }
  };

  const upload = () => {
    if (!payload.length) return;
    setMsg(null);
    startUpload(async () => {
      const res = await uploadInboxAction(payload);
      if (res.error) {
        setMsg({ kind: "error", text: res.error });
        return;
      }
      setPreviews([]);
      setPayload([]);
      const fresh = await listInboxAction();
      setInbox(fresh);
      setMsg({
        kind: "ok",
        text: `הועלו ${res.uploaded} תמונות ✅ עכשיו כתבי לקלוד בצ׳אט: "העליתי תמונות חדשות לזיהוי" — והוא יזהה ויוסיף את הספרים.`,
      });
    });
  };

  const clearAll = () => {
    startClear(async () => {
      await clearInboxAction();
      setInbox([]);
      setMsg({ kind: "info", text: "התיבה רוקנה." });
    });
  };

  return (
    <div className="space-y-5">
      {/* How it works */}
      <div className="card p-4 bg-surface-2">
        <p className="text-sm text-ink leading-relaxed">
          📷 צלמי מדף או ערימת ספרים והעלי כאן. התמונות נשמרות בתיבת קליטה פרטית,
          וקלוד (העוזר בצ׳אט) קורא אותן, מזהה כל ספר, מושך כריכה ותקציר ומוסיף לספרייה —
          <strong> בלי שום עלות</strong>. אחרי ההעלאה, פשוט כתבי לו שהעלית תמונות חדשות.
        </p>
      </div>

      {/* Upload */}
      <div className="card p-4">
        <label className="block">
          <span className="block text-sm font-medium text-ink-soft mb-2">
            בחרי תמונות (אפשר כמה בבת אחת, גם ישירות מהמצלמה)
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPick}
            className="block w-full text-sm text-ink-soft file:ml-3 file:rounded-lg file:border-0 file:bg-secondary file:text-white file:px-4 file:py-2 file:font-semibold file:cursor-pointer"
          />
        </label>

        {previews.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-24 rounded-lg border border-line" />
            ))}
          </div>
        )}

        {payload.length > 0 && (
          <button
            onClick={upload}
            disabled={uploading}
            className="mt-3 w-full rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold py-3 transition disabled:opacity-60"
          >
            {uploading ? "מעלה…" : `העלאת ${payload.length} תמונות`}
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`text-sm rounded-lg px-3 py-3 leading-relaxed ${
            msg.kind === "error"
              ? "text-danger bg-primary-soft"
              : msg.kind === "ok"
                ? "text-ink bg-primary-soft border border-primary"
                : "text-ink bg-surface-2"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Pending inbox */}
      {inbox.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink">
              ממתינות לזיהוי · {inbox.length} תמונות
            </p>
            <button
              onClick={clearAll}
              disabled={clearing}
              className="text-xs rounded-md px-2 py-1 bg-surface-2 text-ink-soft hover:text-danger disabled:opacity-50"
            >
              {clearing ? "מנקה…" : "מחיקת הכל"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {inbox.map((it) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={it.name}
                src={it.url}
                alt=""
                className="h-20 w-20 object-cover rounded-lg border border-line"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
