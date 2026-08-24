import { requireProfile } from "@/lib/auth";
import { Nav, type NavItem } from "@/components/nav";

const memberNav: NavItem[] = [
  { href: "/library", label: "ספרייה", icon: "📚" },
  { href: "/search", label: "חיפוש", icon: "🔍" },
  { href: "/to-read", label: "לקרוא", icon: "📖" },
  { href: "/series", label: "סדרות", icon: "📖" },
  { href: "/favorites", label: "מועדפים", icon: "❤️" },
  { href: "/shopping", label: "לקנות", icon: "🛒" },
  { href: "/profile", label: "פרופיל", icon: "👤" },
];

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: "📊" },
  { href: "/library", label: "ספרייה", icon: "📚" },
  { href: "/search", label: "חיפוש", icon: "🔍" },
  { href: "/series", label: "סדרות", icon: "📖" },
  { href: "/shopping", label: "קניות", icon: "🛒" },
  { href: "/review", label: "טעון עיון", icon: "⚠️" },
  { href: "/notifications", label: "התראות", icon: "🔔" },
  { href: "/profile", label: "פרופיל", icon: "👤" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items = profile.role === "admin" ? adminNav : memberNav;

  return (
    <div className="flex min-h-dvh">
      <Nav items={items} displayName={profile.display_name} role={profile.role} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
