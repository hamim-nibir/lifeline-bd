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
  "e.g. Car, bus, motorcycle": "report.placeholders.vehicleType",
  "e.g. DHA-1234": "report.placeholders.plateNumber",
  "e.g. 2": "report.placeholders.numInjured",
  "Building name, floor, nearby landmark": "report.placeholders.firePlace",
  "e.g. Colleague, neighbour, unknown": "report.placeholders.suspectRelation",
  "Who needs help?": "report.placeholders.patientName",
  "Describe symptoms and when they started": "report.placeholders.symptoms",
  "Allergies, medicines taken, medical history if known": "report.placeholders.medicalDetails",
  "e.g. 12": "report.placeholders.missingAge",
  "e.g. Parent, sibling, friend": "report.placeholders.relationship",
  "e.g. 18 Mar 2026, 4:00 PM": "report.placeholders.lastSeenDate",
  "Address or landmark": "report.placeholders.lastSeenPlace",
  "What were they wearing? Height, hair, marks?": "report.placeholders.clothing",
  "1": "report.placeholders.numInjured",
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
  const catHit = translate(`report.${category}.options.${slug}`, locale, "");
  if (catHit && !catHit.startsWith("report.")) return catHit;
  const commonHit = translate(`report.options.common.${slug}`, locale, "");
  if (commonHit && !commonHit.startsWith("report.")) return commonHit;
  return option;
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
