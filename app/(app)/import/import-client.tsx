"use client";

import { useState, useTransition } from "react";
import { extractAction, commitAction, type ImportCandidate } from "./actions";
import { Cover } from "@/components/books/cover";

/** Downscale an image file to <=1600px, JPEG, and return base64 (no data-URL prefix). */
function processFile(file: File): Promise<{ data: string; mediaType: string; preview: string }> {
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
        resolve({ data: dataUrl.split(",")[1], mediaType: "image/jpeg", preview: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImportClient() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [payload, setPayload] = useState<{ data: string; mediaType: string }[]>([]);
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<{ kind: "error" | "warn" | "ok"; text: string } | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number; errors: number } | null>(null);
  const [extracting, startExtract] = useTransition();
  const [committing, startCommit] = useTransition();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMsg(null);
    setResult(null);
    setCandidates(null);
    try {
      const processed = await Promise.all(files.map(processFile));
      setPreviews(processed.map((p) => p.preview));
      setPayload(processed.map((p) => ({ data: p.data, mediaType: p.mediaType })));
    } catch {
      setMsg({ kind: "error", text: "בעיה בטעינת התמונות. נסי שוב." });
    }
  };

  const extract = () => {
    if (!payload.length) return;
    setMsg(null);
    setResult(null);
    startExtract(async () => {
      const res = await extractAction(payload);
      if (res.error) {
        setMsg({ kind: "error", text: res.error });
        return;
      }
      setCandidates(res.candidates);
      // default-select everything that isn't a duplicate
      setSelected(new Set(res.candidates.map((c, i) => (c.duplicate ? -1 : i)).filter((i) => i >= 0)));
      if (res.warning) setMsg({ kind: "warn", text: res.warning });
      else if (!res.candidates.length) setMsg({ kind: "warn", text: "לא זוהו ספרים." });
    });
  };

  const toggle = (i: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const edit = (i: number, k: keyof ImportCandidate, v: string) =>
    setCandidates((cs) => cs && cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  const commit = () => {
    if (!candidates) return;
    const chosen = candidates.filter((_, i) => selected.has(i));
    if (!chosen.length) {
      setMsg({ kind: "warn", text: "לא נבחרו ספרים להוספה." });
      return;
    }
    startCommit(async () => {
      const res = await commitAction(chosen);
      setResult(res);
      setCandidates(null);
      setPreviews([]);
      setPayload([]);
      setSelected(new Set());
      setMsg({ kind: "ok", text: `נוספו ${res.added} ספרים לספרייה.` });
    });
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="card p-4">
        <label className="block">
          <span className="block text-sm font-medium text-ink-soft mb-2">
            בחרי תמונות של ספרים (אפשר כמה בבת אחת, גם מהמצלמה)
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
            onClick={extract}
            disabled={extracting}
            className="mt-3 w-full rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold py-3 transition disabled:opacity-60"
          >
            {extracting ? "מזהה ספרים… (עד דקה)" : `זהי ספרים מ-${payload.length} תמונות`}
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            msg.kind === "error"
              ? "text-danger bg-primary-soft"
              : msg.kind === "ok"
                ? "text-white bg-primary"
                : "text-ink bg-surface-2"
          }`}
        >
          {msg.text}
        </p>
      )}

      {result && (
        <div className="card p-4 text-sm text-ink">
          ✅ נוספו {result.added} ספרים · דילוג (כפילויות) {result.skipped}
          {result.errors ? ` · שגיאות ${result.errors}` : ""} ·{" "}
          <a href="/library" className="underline text-primary">לספרייה</a>
        </div>
      )}

      {/* Candidates */}
      {candidates && candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              זוהו {candidates.length} ספרים · נבחרו {selected.size}
            </p>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setSelected(new Set(candidates.map((_, i) => i)))}
                className="rounded-md px-2 py-1 bg-surface-2 text-ink-soft hover:text-ink"
              >
                בחרי הכל
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-md px-2 py-1 bg-surface-2 text-ink-soft hover:text-ink"
              >
                נקי
              </button>
            </div>
          </div>

          {candidates.map((c, i) => (
            <div
              key={i}
              className={`card p-3 flex gap-3 ${selected.has(i) ? "ring-2 ring-primary" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
              />
              <div className="w-14 shrink-0 aspect-[2/3] rounded overflow-hidden bg-surface-2">
                <Cover url={c.cover_url || null} title={c.title} />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  value={c.title}
                  onChange={(e) => edit(i, "title", e.target.value)}
                  className="w-full font-semibold text-ink rounded border border-line bg-surface px-2 py-1 outline-none focus:border-primary"
                />
                <input
                  value={c.author}
                  placeholder="סופר/ת"
                  onChange={(e) => edit(i, "author", e.target.value)}
                  className="w-full text-sm text-ink-soft rounded border border-line bg-surface px-2 py-1 outline-none focus:border-primary"
                />
                <div className="flex gap-1.5">
                  <input
                    value={c.series}
                    placeholder="סדרה"
                    onChange={(e) => edit(i, "series", e.target.value)}
                    className="flex-1 text-xs rounded border border-line bg-surface px-2 py-1 outline-none focus:border-primary"
                  />
                  <input
                    value={c.position}
                    placeholder="מס׳"
                    onChange={(e) => edit(i, "position", e.target.value)}
                    className="w-14 text-xs rounded border border-line bg-surface px-2 py-1 outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {c.duplicate ? (
                    <a
                      href={`/books/${c.duplicate.id}`}
                      className="rounded-full px-2 py-0.5 bg-primary-soft text-danger font-medium"
                    >
                      🔴 כבר בספרייה
                    </a>
                  ) : c.matched ? (
                    <span className="rounded-full px-2 py-0.5 bg-surface-2 text-ink-soft">
                      ✓ נמצא מידע ברשת
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 bg-surface-2 text-ink-soft">
                      ללא מידע נוסף
                    </span>
                  )}
                  {c.published_year && (
                    <span className="rounded-full px-2 py-0.5 bg-surface-2 text-ink-soft">
                      {c.published_year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={commit}
            disabled={committing || selected.size === 0}
            className="w-full rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold py-3 transition disabled:opacity-60"
          >
            {committing ? "מוסיף…" : `הוספת ${selected.size} ספרים לספרייה`}
          </button>
        </div>
      )}
    </div>
  );
}
