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

    let restoring = target > 2;
    let raf = 0;

    const stopRestoring = () => {
      restoring = false;
      cancelAnimationFrame(raf);
    };

    // Re-apply the saved position (countering Next's programmatic scroll-to-top)
    // until it lands — but bail out the moment the user actually scrolls, so we
    // never fight their next scroll.
    if (restoring) {
      const start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const loop = () => {
        if (!restoring) return;
        if (window.scrollY !== target) window.scrollTo(0, target);
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        // keep correcting briefly (late resets), then let go
        if (now - start < 600) raf = requestAnimationFrame(loop);
        else restoring = false;
      };
      raf = requestAnimationFrame(loop);
    }

    // Any real user input hands control back immediately.
    const userEvents = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    userEvents.forEach((e) =>
      window.addEventListener(e, stopRestoring, { passive: true }),
    );

    // Save the current position on every scroll (throttled), unless we're mid-restore.
    let last = 0;
    const save = () => {
      if (restoring) return;
      const now = Date.now();
      if (now - last < 60) return;
      last = now;
      try {
        sessionStorage.setItem(keyFor(), String(window.scrollY));
      } catch {
        // ignore
      }
    };
    window.addEventListener("scroll", save, { passive: true });

    return () => {
      try {
        sessionStorage.setItem(keyFor(), String(window.scrollY));
      } catch {
        // ignore
      }
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", save);
      userEvents.forEach((e) => window.removeEventListener(e, stopRestoring));
    };
  }, []);

  return null;
}
