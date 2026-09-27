"use client";

import { useEffect } from "react";

/**
 * Remembers the library scroll position and restores it when the user returns
 * (e.g. after opening a book). sessionStorage-based, per filter URL, independent
 * of navigation history.
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

    // --- Restore: re-apply the saved position repeatedly for a while, so we win
    // over Next's scroll-to-top and any late layout/content settling. ---
    let restoring = target > 2;
    const timers: number[] = [];
    if (restoring) {
      const apply = () => {
        if (Math.abs(window.scrollY - target) > 2) window.scrollTo(0, target);
      };
      let raf = 0;
      let frames = 0;
      const rafLoop = () => {
        apply();
        if (++frames < 30) raf = requestAnimationFrame(rafLoop);
      };
      raf = requestAnimationFrame(rafLoop);
      timers.push(raf as unknown as number);
      // also catch resets that land after the rAF window
      for (const ms of [80, 200, 400, 700, 1100]) {
        timers.push(window.setTimeout(apply, ms));
      }
      // stop treating scroll events as "reset noise" once things settle
      timers.push(window.setTimeout(() => (restoring = false), 1200));
    }

    // --- Save: write the current position on every scroll (throttled). ---
    let last = 0;
    const save = () => {
      if (restoring) return;
      const now = Date.now();
      if (now - last < 80) return;
      last = now;
      try {
        sessionStorage.setItem(keyFor(), String(window.scrollY));
      } catch {
        // ignore
      }
    };
    window.addEventListener("scroll", save, { passive: true });

    return () => {
      // Capture the final position as the user leaves the library.
      try {
        sessionStorage.setItem(keyFor(), String(window.scrollY));
      } catch {
        // ignore
      }
      window.removeEventListener("scroll", save);
      timers.forEach((t) => {
        clearTimeout(t);
        cancelAnimationFrame(t);
      });
    };
  }, []);

  return null;
}
