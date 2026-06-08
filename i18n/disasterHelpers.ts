import type { PreparednessDisasterType } from "../constants/disasterPreparedness";
import { PREPAREDNESS_GUIDES, type PreparednessGuide } from "../constants/disasterPreparedness";
import { bn } from "../locales/bn";
import { en } from "../locales/en";
import type { AppLocale } from "../store/languageStore";

const dictionaries = { en, bn };

export function getLocalizedPreparednessGuide(
  type: PreparednessDisasterType,
  locale: AppLocale
): PreparednessGuide {
  const p = dictionaries[locale].disaster.preparedness[type];
  const base = PREPAREDNESS_GUIDES[type];
  return {
    type,
    icon: base.icon,
    summary: p.summary,
    essentials: [...p.essentials],
    safetyTips: [...p.safetyTips],
  };
}

export function disasterTypeLabel(
  type: Exclude<PreparednessDisasterType, "Other"> | "Other",
  t: (key: string, fallback?: string) => string
): string {
  const map: Record<string, string> = {
    Flood: t("disaster.flood"),
    Cyclone: t("disaster.cyclone"),
    Earthquake: t("disaster.earthquake"),
    Other: t("disaster.other"),
  };
  return map[type] ?? type;
}

export function urgencyLabel(
  level: "Critical" | "High" | "Moderate",
  t: (key: string, fallback?: string) => string
): string {
  const map = {
    Critical: t("disaster.urgency.critical"),
    High: t("disaster.urgency.high"),
    Moderate: t("disaster.urgency.moderate"),
  };
  return map[level];
}
