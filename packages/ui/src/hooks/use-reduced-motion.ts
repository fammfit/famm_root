import * as React from "react";

/**
 * Reads the user's `prefers-reduced-motion` setting and updates on change.
 *
 * Components that animate must branch on this. See docs/DESIGN_SYSTEM.md §5.
 */
export function useReducedMotion(): boolean {
  const subscribe = React.useCallback((onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
