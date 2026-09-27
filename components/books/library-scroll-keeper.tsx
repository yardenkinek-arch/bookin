"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * Remembers the library scroll position and restores it when the user comes
 * back (e.g. after opening a book). Uses sessionStorage so it's per-tab and
 * independent of navigation history — no fragile router.back() loops.
 */
const keyFor = () =>
  `library-scroll:${typeof window !== "undefined" ? window.location.search : ""}`;

export function LibraryScrollKeeper() {
  // Restore before paint to avoid a visible jump to the top.
  useLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem(keyFor());
      const y = saved ? parseInt(saved, 10) : 0;
      if (y > 0) window.scrollTo(0, y);
    } catch {
      // sessionStorage unavailable — ignore.
    }
  }, []);

  // Save the position as the user scrolls.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(keyFor(), String(window.scrollY));
        } catch {
          // ignore
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
