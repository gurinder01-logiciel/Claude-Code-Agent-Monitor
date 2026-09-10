/**
 * @file useTheme.ts
 * @description Light/dark theme state for the dashboard. The active theme is written
 * to `data-theme` on `<html>`; every colour in the app resolves through CSS variables
 * keyed off that attribute (see `src/index.css`), so a flip rethemes everything without
 * touching a single component.
 *
 * ## Resolution order
 * 1. an explicit choice previously stored in `localStorage`
 * 2. otherwise the OS preference via `prefers-color-scheme`
 * 3. otherwise dark, which is what the dashboard shipped with
 *
 * While no explicit choice exists the hook keeps following the OS, so a user who
 * never touches the toggle gets their system setting honoured on the fly.
 *
 * `index.html` applies the same resolution inline before first paint; without that
 * the page would flash the wrong theme on load.
 */
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "agent-monitor-theme";

/** Read an explicit stored choice, or null when the user has never chosen. */
export function loadStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null; // private browsing / quota — fall through to the OS preference
  }
}

function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveTheme(): Theme {
  return loadStoredTheme() ?? systemTheme();
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Tailwind's own `dark:` variants and the pre-existing `class="dark"` markup
  // stay consistent with the active theme.
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveTheme);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  // Follow the OS only while the user has made no explicit choice.
  useEffect(() => {
    if (loadStoredTheme()) return;
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = () => setTheme(loadStoredTheme() ?? systemTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* preference simply won't persist; the session still switches */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
