import { create } from "zustand";
import { FireStationCandidate } from "../services/fireStations";

export type FireSeverity = "critical" | "high" | "medium";

export type FireServiceOption = {
  id: string;
  title: string;
  desc: string;
  unit: string;
  icon: string;
};

export type FireRequestDraft = {
  service: FireServiceOption | null;
  severityLevel: FireSeverity;
  contactNumber: string;
  peopleAffected: number | null;
  notes: string;
  userLat: number | null;
  userLng: number | null;
  locationText: string;
  station: FireStationCandidate | null;
};

const initialDraft: FireRequestDraft = {
  service: null,
  severityLevel: "high",
  contactNumber: "",
  peopleAffected: null,
  notes: "",
  userLat: null,
  userLng: null,
  locationText: "",
  station: null,
};

type FireRequestStore = FireRequestDraft & {
  setService: (service: FireServiceOption) => void;
  setDetails: (patch: Partial<Pick<FireRequestDraft, "severityLevel" | "contactNumber" | "peopleAffected" | "notes">>) => void;
  setLocation: (lat: number, lng: number, locationText: string) => void;
  setStation: (station: FireStationCandidate) => void;
  reset: () => void;
};

export const useFireRequestStore = create<FireRequestStore>((set) => ({
  ...initialDraft,
  setService: (service) => set({ service }),
  setDetails: (patch) => set((s) => ({ ...s, ...patch })),
  setLocation: (userLat, userLng, locationText) => set({ userLat, userLng, locationText }),
  setStation: (station) => set({ station }),
  reset: () => set({ ...initialDraft }),
}));

export const FIRE_WIZARD_STEPS = [
  "Service Type",
  "Details",
  "Location",
  "Confirm",
] as const;

export const FIRE_SERVICES: FireServiceOption[] = [
  {
    id: "rescue",
    title: "Rescue Service",
    desc: "Emergency rescue operations and evacuations",
    unit: "Rapid Rescue Unit",
    icon: "🚒",
  },
  {
    id: "industrial",
    title: "Industrial Fire Service",
    desc: "Industrial facility fire emergencies",
    unit: "Industrial Response Team",
    icon: "🏭",
  },
  {
    id: "hazmat",
    title: "Hazardous Materials Service",
    desc: "Chemical spills and hazardous material incidents",
    unit: "Hazmat Unit",
    icon: "⚠️",
  },
  {
    id: "highrise",
    title: "High-Rise Fire Service",
    desc: "Multi-story building fire emergencies",
    unit: "Urban Ladder Team",
    icon: "🏢",
  },
];

export function isValidBdPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^01[3-9]\d{8}$/.test(digits);
}

export function formatSeverityLabel(level: FireSeverity | string): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "low") return "Low";
  return "Medium";
}
