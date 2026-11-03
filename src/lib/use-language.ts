"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./i18n";

/**
 * Hydration-safe language preference.
 *
 * The server snapshot and the first client render both resolve to
 * `DEFAULT_LANGUAGE`. The persisted preference (localStorage) is only read
 * through `useSyncExternalStore` after hydration, so SSR markup and the first
 * client render can never disagree about the language.
 */

const LANGUAGE_KEY = "hni_pos_language";
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

export function useLanguage(): {
  language: Language;
  setLanguage: (next: Language) => void;
} {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, quota) — UI still updates.
    }
    emit();
  }, []);

  // Keep the document attribute in sync. This runs post-hydration and does not
  // affect server-rendered markup.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return { language, setLanguage };
}
