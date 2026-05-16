"use client";

import { useEffect } from "react";

/**
 * Adds `is-mounted` to <html> after hydration. Used to gate CSS entrance
 * animations on the section-enter pattern: pre-mount, sections are at
 * their post-animation visual state (visible) so SSR is readable and
 * JS-less users see content; post-mount, the CSS replays the entrance
 * from the `from` state.
 *
 * No state, no children — render once at the app shell level.
 */
export function MountedRoot(): null {
  useEffect(() => {
    document.documentElement.classList.add("is-mounted");
    return () => {
      document.documentElement.classList.remove("is-mounted");
    };
  }, []);
  return null;
}
