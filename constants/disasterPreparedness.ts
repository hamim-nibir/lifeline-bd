export type PreparednessDisasterType = "Flood" | "Cyclone" | "Earthquake" | "Other";

export type PreparednessGuide = {
  type: PreparednessDisasterType;
  icon: string;
  summary: string;
  essentials: string[];
  safetyTips: string[];
};

export const PREPAREDNESS_GUIDES: Record<PreparednessDisasterType, PreparednessGuide> = {
  Flood: {
    type: "Flood",
    icon: "🌊",
    summary: "Move to higher ground immediately. Avoid flood water.",
    essentials: [
      "Dry food & drinking water (3+ days)",
      "Medicines & first-aid kit",
      "Torch, power bank & whistle",
      "Important documents in waterproof bag",
      "Warm clothes & raincoat",
      "Cash, masks & sanitizer",
    ],
    safetyTips: [
      "Do not walk or drive through moving flood water.",
      "Switch off electricity if water enters your home.",
      "Follow local evacuation orders.",
    ],
  },
  Cyclone: {
    type: "Cyclone",
    icon: "🌀",
    summary: "Reach a cyclone shelter before wind intensifies.",
    essentials: [
      "Dry food, water & oral rehydration salts",
      "Medicines & first-aid supplies",
      "Torch, batteries & power bank",
      "ID cards & documents in plastic bag",
      "Blanket & warm clothing",
      "Baby supplies if needed",
    ],
    safetyTips: [
      "Stay indoors away from windows.",
      "Listen to Bangladesh Meteorological Department updates.",
      "Evacuate coastal areas when advised.",
    ],
  },
  Earthquake: {
    type: "Earthquake",
    icon: "🫨",
    summary: "Drop, cover, and hold on. Prepare to evacuate if structures are unsafe.",
    essentials: [
      "First-aid kit & essential medicines",
      "Water & non-perishable snacks",
      "Torch & whistle",
      "Sturdy shoes & dust masks",
      "Copies of ID & emergency contacts",
      "Cash",
    ],
    safetyTips: [
      "Stay away from buildings, trees, and power lines after shaking.",
      "Check for gas leaks; do not use open flames if you smell gas.",
      "Use stairs, not elevators.",
    ],
  },
  Other: {
    type: "Other",
    icon: "⚠️",
    summary: "Follow official guidance and keep an emergency kit ready.",
    essentials: [
      "Water & dry food (3 days)",
      "Medicines & first-aid kit",
      "Torch & power bank",
      "Documents & cash",
      "Phone charger",
    ],
    safetyTips: [
      "Stay tuned to local news and government alerts.",
      "Share your location with family.",
    ],
  },
};

const SKIP_EVENT_PATTERN =
  /LANDSLIDE|WILDFIRE|DROUGHT|VOLCANO|\bWF\b|\bDR\b|\bLS\b|\bVO\b/i;

/** Map API event codes to supported preparedness types; returns null to skip event */
export function mapEventToPreparednessType(
  eventType: string,
  title = ""
): PreparednessDisasterType | null {
  const t = `${eventType} ${title}`;
  if (SKIP_EVENT_PATTERN.test(t)) return null;

  const u = t.toUpperCase();
  if (u.includes("FL") || u.includes("FLOOD")) return "Flood";
  if (u.includes("TC") || u.includes("CYCLONE") || u.includes("STORM") || u.includes("HURRICANE"))
    return "Cyclone";
  if (u.includes("EQ") || u.includes("EARTHQUAKE") || u.includes("SEISMIC")) return "Earthquake";
  return "Other";
}
