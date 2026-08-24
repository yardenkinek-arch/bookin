"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Bottom nav (mobile) + sidebar (desktop). Highlights the active route. */
export function Nav({
  items,
  displayName,
  role,
}: {
  items: NavItem[];
  displayName: string;
  role: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // primary items shown in the mobile bottom bar (max 5)
  const mobileItems = items.slice(0, 5);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-l border-line bg-surface min-h-dvh sticky top-0">
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-2 text-lg font-bold text-ink">
            <span className="text-2xl">📚</span> הספרייה שלנו
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(it.href)
                  ? "bg-primary-soft text-primary"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="text-lg">{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-line">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2 transition"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white font-semibold">
              {displayName.charAt(0)}
            </span>
            <span className="text-sm">
              <span className="block font-medium text-ink">{displayName}</span>
              <span className="block text-xs text-ink-soft">
                {role === "admin" ? "מנהלת" : "בן/בת משפחה"}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {mobileItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] font-medium transition ${
                isActive(it.href) ? "text-primary" : "text-ink-soft"
              }`}
            >
              <span className="text-xl">{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
