import { DATE_LOCALES, DICT, LANGS, RTL, type Lang } from "./dict";

export { DICT, LANGS, type Lang };

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  const l = localStorage.getItem("app_lang") || "en";
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

export function setLang(l: Lang) {
  localStorage.setItem("app_lang", l);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getLang();
  let s =
    DICT[lang]?.[key] ??
    DICT.en[key] ??
    key;
  if (params) {
    for (const k in params) {
      s = s.split(`{${k}}`).join(String(params[k]));
    }
  }
  return s;
}

export function dateLocale(): string {
  return DATE_LOCALES[getLang()] || "en-GB";
}

export function isRtl(lang?: Lang): boolean {
  return RTL.has(lang ?? getLang());
}
