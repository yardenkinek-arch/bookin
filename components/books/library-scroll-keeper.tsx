"use client";

import { useEffect } from "react";

/**
 * Remembers the library scroll position and restores it when the user returns
 * (e.g. after opening a book).
 *
 * Only the USER's scrolling updates the saved position — Next resets scroll to
 * the top on navigation (a programmatic scroll), and saving that would clobber
 * the real position with 0. So we save only while a real input (wheel / touch /
 * key / pointer) drives the scroll, and re-apply the saved position on return
 * using setTimeout retries (rAF can be paused during a navigation, so it is not
 * reliable here).
 */
const keyFor = () =>
  `library-scroll:${typeof window !== "undefined" ? window.location.search : ""}`;

const INPUT_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

export function LibraryScrollKeeper() {
  useEffect(() => {
    let target = 0;
    try {
      const saved = sessionStorage.getItem(keyFor());
      target = saved ? parseInt(saved, 10) : 0;
    } catch {
      target = 0;
    }

    let userTouched = false;
    const markUser = () => {
      userTouched = true;
    };
    INPUT_EVENTS.forEach((e) =>
      window.addEventListener(e, markUser, { passive: true }),
    );

    // Save only real user scrolling; ignore programmatic scroll.
    let lastSave = 0;
    const onScroll = () => {
      if (!userTouched) return;
      const now = Date.now();
      if (now - lastSave < 60) return;
      lastSave = now;
      try {
        sessionStorage.setItem(keyFor(), String(window.scrollY));
      } catch {
        // ignore
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Restore: re-apply the saved position a few times until it sticks, bailing
    // out the moment the user scrolls.
    const timers: number[] = [];
    if (target > 2) {
      const apply = () => {
        if (userTouched) return;
        if (window.scrollY !== target) window.scrollTo(0, target);
      };
      apply();
      for (const ms of [0, 40, 90, 160, 260, 400, 600, 850]) {
        timers.push(window.setTimeout(apply, ms));
      }
    }

    return () => {
      INPUT_EVENTS.forEach((e) => window.removeEventListener(e, markUser));
      window.removeEventListener("scroll", onScroll);
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return null;
}
