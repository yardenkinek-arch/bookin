"use client";

import { useEffect } from "react";

/**
 * Remembers the library scroll position and restores it when the user comes
 * back (e.g. after opening a book). Uses sessionStorage so it's per-tab and
 * independent of navigation history — no fragile router.back() loops.
 *
 * Next resets scroll to the top on a new navigation, so we re-apply the saved
 * position over the next few frames until it sticks, and suppress saving while
 * that restore is in progress (so the reset-to-top doesn't overwrite it).
 */
const keyFor = () =>
  `library-scroll:${typeof window !== "undefined" ? window.location.search : ""}`;

export function LibraryScrollKeeper() {
  useEffect(() => {
    let target = 0;
    try {
      const saved = sessionStorage.getItem(keyFor());
      target = saved ? parseInt(saved, 10) : 0;
    } catch {
      target = 0;
    }

    let restoring = target > 2;
    let frame = 0;
    let saveRaf = 0;
    let tries = 0;

    const restore = () => {
      window.scrollTo(0, target);
      tries += 1;
      if (tries < 10 && Math.abs(window.scrollY - target) > 2) {
        frame = requestAnimationFrame(restore);
      } else {
        restoring = false;
      }
    };
    if (restoring) frame = requestAnimationFrame(restore);

    const onScroll = () => {
      if (restoring) return; // don't record the reset-to-top while restoring
      cancelAnimationFrame(saveRaf);
      saveRaf = requestAnimationFrame(() => {
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
      cancelAnimationFrame(frame);
      cancelAnimationFrame(saveRaf);
    };
  }, []);

  return null;
}
