import { en } from "../locales/en";
import { bn } from "../locales/bn";
import type { AppLocale } from "../store/languageStore";
import { useLanguageStore } from "../store/languageStore";

export type TranslationDict = typeof en;

const dictionaries: Record<AppLocale, TranslationDict> = { en, bn };

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Translate by dot-path key; optional fallback when key is missing. */
export function translate(
  key: string,
  locale?: AppLocale,
  fallback?: string
): string {
  const lang = locale ?? useLanguageStore.getState().locale;
  const hit = resolve(dictionaries[lang] as unknown as Record<string, unknown>, key);
  if (hit) return hit;
  const enHit = resolve(dictionaries.en as unknown as Record<string, unknown>, key);
  if (enHit) return enHit;
  return fallback ?? key;
}

export function optionSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
