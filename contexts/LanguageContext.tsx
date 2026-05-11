import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Language, translations, TranslationTree } from "../locales/translations";

type Params = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: string, params?: Params) => string;
};

const STORAGE_KEY = "app_language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

const getNestedValue = (obj: TranslationTree, key: string): string | undefined => {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as TranslationTree)[part];
  }, obj) as string | undefined;
};

const interpolate = (template: string, params?: Params): string => {
  if (!params) return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, token) => {
    const value = params[token.trim()];
    return value === undefined ? "" : String(value);
  });
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (mounted && (saved === "en" || saved === "bn")) {
        setLanguageState(saved);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const toggleLanguage = useCallback(async () => {
    const next = language === "en" ? "bn" : "en";
    await setLanguage(next);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, params?: Params): string => {
      const selected = getNestedValue(translations[language], key);
      const fallback = getNestedValue(translations.en, key);
      const text = selected ?? fallback ?? key;
      return interpolate(text, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
