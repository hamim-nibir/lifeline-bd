import type { ReportCategory, ReportFieldDef, ReportTypeConfig } from "../constants/citizenReportConfig";
import { optionSlug, translate } from "./index";
import type { AppLocale } from "../store/languageStore";

const PLACEHOLDER_KEYS: Record<string, string> = {
  "Full name": "report.placeholders.fullName",
  "01XXXXXXXXX": "report.placeholders.phone",
  "What did they see or hear?": "report.placeholders.eyewitnessStatement",
  "e.g. Today 3:30 PM / 12 Mar 2026, 8:00 PM": "report.placeholders.dateTime",
  "Street, area, landmark": "report.placeholders.place",
  "Appearance, clothing, vehicle, direction of escape…": "report.placeholders.suspect",
  "Describe the crime in detail": "report.placeholders.crimeDesc",
  "Number and severity of injuries": "report.placeholders.injuries",
  "Describe the accident": "report.placeholders.accidentDesc",
  "Size, spread, hazards…": "report.placeholders.fireDesc",
  "Name, description, relationship if known": "report.placeholders.perpetrator",
  "Describe harassment in detail": "report.placeholders.harassmentDesc",
  "e.g. chest pain, unconscious, bleeding": "report.placeholders.symptoms",
  "e.g. 45": "report.placeholders.patientAge",
  "Allergies, medications, history…": "report.placeholders.medicalDetails",
  "What they were wearing": "report.placeholders.clothing",
  "Any other relevant information": "report.placeholders.circumstances",
};

const SHARED_FIELD_KEYS = new Set([
  "eyewitnessName",
  "eyewitnessPhone",
  "eyewitnessStatement",
]);

export function translateFieldLabel(
  category: ReportCategory,
  field: ReportFieldDef,
  locale?: AppLocale
): string {
  if (SHARED_FIELD_KEYS.has(field.key)) {
    const key = `report.fields.${field.key}`;
    return translate(key, locale, field.label);
  }
  const key = `report.${category}.${field.key}`;
  return translate(key, locale, field.label);
}

export function translateFieldPlaceholder(
  placeholder: string | undefined,
  locale?: AppLocale
): string | undefined {
  if (!placeholder) return undefined;
  const key = PLACEHOLDER_KEYS[placeholder];
  if (key) return translate(key, locale, placeholder);
  return placeholder;
}

export function translateSelectOption(
  category: ReportCategory,
  option: string,
  locale?: AppLocale
): string {
  const slug = optionSlug(option);
  const key = `report.${category}.options.${slug}`;
  return translate(key, locale, option);
}

export function translateReportType(
  type: ReportTypeConfig,
  locale?: AppLocale
): { title: string; subtitle: string } {
  return {
    title: translate(`report.types.${type.category}.title`, locale, type.title),
    subtitle: translate(`report.types.${type.category}.subtitle`, locale, type.subtitle),
  };
}

export function translateOfficeLabel(
  officeId: string,
  fallback: string,
  locale?: AppLocale
): string {
  return translate(`offices.${officeId}`, locale, fallback);
}

export function interpolate(template: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    template
  );
}
