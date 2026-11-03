"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./i18n";

/**
 * Hydration-safe language preference.
 */

const LANGUAGE_KEY = "hni_pos_language";
const LANGUAGE_COOKIE_KEY = "hni_pos_language";
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

function getCookieLanguage(): Language | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp("(^| )" + LANGUAGE_COOKIE_KEY + "=([^;]+)"));
    if (match) {
      const value = decodeURIComponent(match[2]);
      return isLanguage(value) ? value : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function getHtmlLang(): Language | null {
  if (typeof document === "undefined") return null;
  try {
    const lang = document.documentElement.lang;
    return isLanguage(lang) ? lang : null;
  } catch {
    return null;
  }
}

function getSnapshot(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  const cookieLang = getCookieLanguage();
  if (cookieLang) {
    return cookieLang;
  }
  const htmlLang = getHtmlLang();
  if (htmlLang) {
    return htmlLang;
  }
  return DEFAULT_LANGUAGE;
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function setCookieLanguage(next: Language): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function useLanguage(): {
  language: Language;
  setLanguage: (next: Language) => void;
} {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const language = useSyncExternalStore(
    subscribe,
    mounted ? getSnapshot : getServerSnapshot,
    getServerSnapshot,
  );

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Ignore storage failures
    }
    setCookieLanguage(next);
    emit();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = language;
  }, [language, mounted]);

  return { language, setLanguage };
}
