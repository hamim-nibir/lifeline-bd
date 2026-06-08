import { useCallback } from "react";
import { translate } from "../i18n";
import { useLanguageStore, type AppLocale } from "../store/languageStore";

export function useTranslation() {
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const hydrated = useLanguageStore((s) => s.hydrated);

  const t = useCallback(
    (key: string, fallback?: string) => translate(key, locale, fallback),
    [locale]
  );

  return { t, locale, setLocale, hydrated };
}

export function getCategoryLabel(category: string, locale?: AppLocale): string {
  return translate(`report.types.${category}.title`, locale);
}
