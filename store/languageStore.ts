import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type AppLocale = "en" | "bn";

const STORAGE_KEY = "@lifeline/locale";

type LanguageStore = {
  locale: AppLocale;
  hydrated: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  locale: "en",
  hydrated: false,
  setLocale: async (locale) => {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
    set({ locale });
  },
  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "bn") {
        set({ locale: saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
