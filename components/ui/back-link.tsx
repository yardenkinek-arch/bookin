"use client";

import { useRouter } from "next/navigation";

/**
 * A "back" control that returns to the previous page via history (restoring the
 * scroll position the user left), falling back to a fixed href when there is no
 * history to go back to (e.g. the page was opened directly).
 */
export function BackLink({
  fallbackHref,
  className,
  children,
}: {
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
