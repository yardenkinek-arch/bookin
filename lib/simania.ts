/**
 * Simania (simania.co.il) — the Israeli book database. Used to enrich books with
 * a cover image, a Hebrew description, publication year and series info.
 *
 * Matching is deliberately conservative (never attach the wrong same-title book):
 * when both our record and the candidate have an author, the authors MUST agree.
 * Server-only (uses fetch against Simania and reads image bytes).
 */

const UA = "Mozilla/5.0";
const SIMANIA = "https://simania.co.il";

export interface SimaniaBook {
  ID: number;
  NAME: string;
  AUTHOR: string;
  PUBLISHER?: string;
  YEAR?: number | string;
  PAGES?: number | string;
  imageLink?: string;
  hasImage?: number;
  DESCRIPTION?: string;
  SERIES?: string;
  seriesNumber?: number | string;
  ISBN?: string;
}

// --- Hebrew-aware normalization ---
const stripNiqqud = (s: string) => s.replace(/[֑-ׇ]/g, "");
export const norm = (s: string) =>
  stripNiqqud(s || "")
    .replace(/[׳״'"״׳`.,:;!?()\[\]{}<>–—\-–—/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const toks = (s: string) => norm(s).split(" ").filter((w) => w.length > 1);
const jac = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
};

export async function searchSimania(title: string): Promise<SimaniaBook[]> {
  const url = SIMANIA + "/api/search?query=" + encodeURIComponent(title);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) return [];
    const d = await r.json();
    return d?.success ? (d.data?.books ?? []) : [];
  } catch {
    return [];
  }
}

/** Best conservative match, or null. Authors must agree when both sides have one. */
export function pickMatch(
  title: string,
  author: string,
  candidates: SimaniaBook[],
): SimaniaBook | null {
  const bt = toks(title), bn = norm(title), at = toks(author);
  let best: SimaniaBook | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const cn = norm(c.NAME);
    let titleScore = jac(bt, toks(c.NAME));
    if (cn === bn) titleScore = 1;
    else if (cn && (cn.includes(bn) || bn.includes(cn))) titleScore = Math.max(titleScore, 0.75);
    let authorScore: number | null = null;
    if (at.length && c.AUTHOR) authorScore = jac(at, toks(c.AUTHOR));
    const accept =
      authorScore !== null ? titleScore >= 0.6 && authorScore >= 0.4 : titleScore >= 0.85;
    if (!accept) continue;
    const combined = titleScore * 2 + (authorScore || 0);
    if (combined > bestScore) {
      bestScore = combined;
      best = c;
    }
  }
  return best;
}

/** Absolute, hotlink-safe cover URL for a Simania imageLink, or null. */
export function coverUrl(imageLink?: string): string | null {
  if (!imageLink) return null;
  const m = imageLink.match(/imageName=([^&]+)/);
  const path = m ? "/bookimages/" + decodeURIComponent(m[1]) : imageLink;
  return SIMANIA + (path.startsWith("/") ? path : "/" + path);
}

/** Download a cover; returns a real JPEG buffer or null (rejects tiny placeholders). */
export async function downloadCover(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 3000 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    return buf;
  } catch {
    return null;
  }
}

export const cleanDescription = (s: string) =>
  (s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, 2500);

export interface SimaniaEnrichment {
  matched: boolean;
  coverUrl: string | null; // Simania URL, for preview / later download
  description: string | null;
  publishedYear: number | null;
  seriesName: string | null;
  seriesPosition: number | null;
  publisher: string | null;
}

/** Look up {title, author} on Simania and return enrichment for preview (no upload). */
export async function enrichFromSimania(
  title: string,
  author: string,
): Promise<SimaniaEnrichment> {
  const cands = await searchSimania(title);
  const m = cands.length ? pickMatch(title, author, cands) : null;
  if (!m) {
    return {
      matched: false,
      coverUrl: null,
      description: null,
      publishedYear: null,
      seriesName: null,
      seriesPosition: null,
      publisher: null,
    };
  }
  const year = Number(m.YEAR);
  const pos = Number(m.seriesNumber);
  return {
    matched: true,
    coverUrl: m.hasImage ? coverUrl(m.imageLink) : null,
    description: m.DESCRIPTION && m.DESCRIPTION.trim().length > 20 ? cleanDescription(m.DESCRIPTION) : null,
    publishedYear: Number.isFinite(year) && year > 1900 && year <= 2026 ? year : null,
    seriesName: m.SERIES?.trim() || null,
    seriesPosition: Number.isFinite(pos) && pos > 0 ? pos : null,
    publisher: m.PUBLISHER?.trim() || null,
  };
}
