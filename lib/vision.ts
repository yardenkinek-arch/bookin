/**
 * Extract books from a photo of book spines/covers using Claude vision.
 * Server-only. Requires ANTHROPIC_API_KEY in the environment.
 */
import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedBook {
  title: string;
  author?: string;
  series?: string;
  position?: number;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not configured");
    this.name = "MissingApiKeyError";
  }
}

const SYSTEM = `אתה מזהה ספרים מתוך תצלום. בתמונה מופיעים ספרים עבריים — שדרות ספרים על מדף, ערימת ספרים, או כריכות.
המשימה: לזהות כל ספר שאפשר לקרוא בבירור, ולהחזיר את שמו ואת שם הסופר/ת אם הוא נראה.

כללים מחייבים:
- אל תמציא. אם שדרה מטושטשת, חתוכה או שאינך בטוח — פשוט דלג עליה. עדיף לפספס ספר מאשר להמציא שם.
- העתק את השם בדיוק כפי שהוא מודפס, בעברית.
- אם מזוהה סדרה ומספר בסדרה (למשל "כראמל 3"), החזר אותם בשדות series ו-position.
- שם הסופר רק אם הוא באמת נראה על הכריכה/שדרה. אם לא נראה — השאר ריק.
- החזר אך ורק מערך JSON תקין, בלי טקסט נוסף, בלי הסברים.

פורמט כל פריט: {"title": string, "author": string, "series": string, "position": number}
שדות שאינם ידועים — השמט אותם או השאר מחרוזת ריקה.`;

/** Extract books from one base64 image. Returns [] if nothing readable. */
export async function extractBooksFromImage(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<ExtractedBook[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          {
            type: "text",
            text: "זהה את כל הספרים בתמונה והחזר מערך JSON בלבד, ללא טקסט לפני או אחרי.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseBooks(text);
}

/** Tolerant parse: pull the first JSON array out of the model's text. */
function parseBooks(raw: string): ExtractedBook[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: ExtractedBook[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title) continue;
    const author = typeof o.author === "string" ? o.author.trim() : "";
    const series = typeof o.series === "string" ? o.series.trim() : "";
    const posNum = Number(o.position);
    out.push({
      title,
      author: author || undefined,
      series: series || undefined,
      position: Number.isFinite(posNum) && posNum > 0 ? posNum : undefined,
    });
  }
  return out;
}
