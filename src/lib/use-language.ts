"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./i18n";

const LANGUAGE_KEY = "hni_pos_language";
const LANGUAGE_COOKIE_KEY = "hni_pos_language";

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
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let next: Language = DEFAULT_LANGUAGE;
    try {
      const stored = window.localStorage.getItem(LANGUAGE_KEY);
      if (isLanguage(stored)) {
        next = stored;
      } else {
        const cookieLang = getCookieLanguage();
        if (cookieLang) next = cookieLang;
      }
    } catch {
      const cookieLang = getCookieLanguage();
      if (cookieLang) next = cookieLang;
    }
    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // ignore
    }
    setCookieLanguage(next);
    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  return { language, setLanguage };
}
