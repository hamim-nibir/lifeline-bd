export type PreparednessDisasterType =
  | "Flood"
  | "Cyclone"
  | "Earthquake"
  | "Landslide"
  | "Fire (Wildfire)"
  | "Drought"
  | "Other";

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
  Landslide: {
    type: "Landslide",
    icon: "⛰️",
    summary: "Leave hillside or slope areas immediately.",
    essentials: [
      "Water & dry food",
      "Medicines & first-aid",
      "Torch & rain gear",
      "Documents & phone charger",
      "Rope & whistle",
    ],
    safetyTips: [
      "Move to stable, flat ground away from slopes.",
      "Watch for cracks in ground or new water springs on hills.",
      "Avoid the path of previous landslides.",
    ],
  },
  "Fire (Wildfire)": {
    type: "Fire (Wildfire)",
    icon: "🔥",
    summary: "Evacuate upwind and toward open areas or designated shelters.",
    essentials: [
      "N95 masks or wet cloth for smoke",
      "Water & snacks",
      "Medicines & first-aid",
      "Important documents",
      "Long sleeves & closed shoes",
    ],
    safetyTips: [
      "Close windows if staying temporarily; leave if smoke is heavy.",
      "Do not return until authorities say it is safe.",
    ],
  },
  Drought: {
    type: "Drought",
    icon: "☀️",
    summary: "Conserve water and monitor health in extreme heat.",
    essentials: [
      "Stored drinking water",
      "ORS & medicines",
      "Electrolyte drinks",
      "Light cotton clothing & hat",
    ],
    safetyTips: [
      "Avoid outdoor work during peak heat hours.",
      "Watch for signs of dehydration in children and elderly.",
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

/** Map external API event codes to our preparedness types */
export function mapEventToPreparednessType(
  eventType: string,
  title = ""
): PreparednessDisasterType {
  const t = `${eventType} ${title}`.toUpperCase();
  if (t.includes("FL") || t.includes("FLOOD")) return "Flood";
  if (t.includes("TC") || t.includes("CYCLONE") || t.includes("STORM") || t.includes("HURRICANE"))
    return "Cyclone";
  if (t.includes("EQ") || t.includes("EARTHQUAKE") || t.includes("SEISMIC")) return "Earthquake";
  if (t.includes("LS") || t.includes("LANDSLIDE")) return "Landslide";
  if (t.includes("WF") || t.includes("FIRE") || t.includes("WILDFIRE")) return "Fire (Wildfire)";
  if (t.includes("DR") || t.includes("DROUGHT")) return "Drought";
  return "Other";
}
