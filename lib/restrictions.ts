import type { Profile } from "@/types/database";

/**
 * Genres considered mature/restricted. Books carrying any of these are hidden
 * from household members who are not allowed to see them.
 */
export const RESTRICTED_GENRES = new Set<string>([
  "אירוטיקה",
  "אימה",
  "מותחן פסיכולוגי",
  "מותחן משפטי",
  "מותחן ריגול",
  "מסתורין",
  "רומנטיקה",
]);

/** Display names (besides the admin) allowed to see restricted books. */
const RESTRICTED_ALLOWED_NAMES = ["אבא"];

/** Whether this user may see books tagged with a restricted genre. */
export function canViewRestricted(
  profile: Pick<Profile, "role" | "display_name">,
): boolean {
  return (
    profile.role === "admin" ||
    RESTRICTED_ALLOWED_NAMES.includes(profile.display_name.trim())
  );
}

/** True if any of the given genre names is restricted. */
export function hasRestrictedGenre(genres: string[]): boolean {
  return genres.some((g) => RESTRICTED_GENRES.has(g));
}
