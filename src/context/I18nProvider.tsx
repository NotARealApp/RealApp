"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dateLocale, getLang, isRtl, setLang, t, type Lang } from "@/lib/i18n";

const I18nContext = createContext<{
  lang: Lang;
  setLanguage: (l: Lang) => void;
  t: typeof t;
  dateLocale: () => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isRtl(lang) ? "rtl" : "ltr");
  }, [lang, mounted]);

  const setLanguage = useCallback((l: Lang) => {
    setLang(l);
    setLangState(l);
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(key, params),
    [lang],
  );

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLanguage,
        t: translate,
        dateLocale: () => dateLocale(),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
