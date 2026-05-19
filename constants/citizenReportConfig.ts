export type ReportCategory =
  | "crime"
  | "accident"
  | "fire"
  | "harassment"
  | "medical"
  | "missing_person";

export type ForwardOfficeId =
  | "police"
  | "hospital"
  | "volunteer"
  | "ambulance"
  | "fire_service";

export type FieldType = "text" | "textarea" | "phone" | "select" | "radio" | "number";

export type ReportFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  multiline?: boolean;
};

export type ReportTypeConfig = {
  category: ReportCategory;
  title: string;
  icon: string;
  color: string;
  accent: string;
  subtitle: string;
  /** Suggested offices — operator can change when forwarding */
  suggestedOffices: ForwardOfficeId[];
  fields: ReportFieldDef[];
};

export const FORWARD_OFFICES: { id: ForwardOfficeId; label: string; icon: string }[] = [
  { id: "police", label: "Police", icon: "🚔" },
  { id: "hospital", label: "Hospital", icon: "🏥" },
  { id: "volunteer", label: "Volunteer", icon: "🧑‍🤝‍🧑" },
  { id: "ambulance", label: "Ambulance", icon: "🚑" },
  { id: "fire_service", label: "Fire Service", icon: "🔥" },
];

const COMMON_WITNESS_FIELDS: ReportFieldDef[] = [
  {
    key: "eyewitnessName",
    label: "Eyewitness name (optional)",
    type: "text",
    placeholder: "Full name",
  },
  {
    key: "eyewitnessPhone",
    label: "Eyewitness phone (optional)",
    type: "phone",
    placeholder: "01XXXXXXXXX",
  },
  {
    key: "eyewitnessStatement",
    label: "Eyewitness statement (optional)",
    type: "textarea",
    placeholder: "What did they see or hear?",
    multiline: true,
  },
];

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    category: "crime",
    title: "Crime Report",
    icon: "🚔",
    color: "#eff6ff",
    accent: "#2563eb",
    subtitle: "Theft, assault, robbery, and other crimes",
    suggestedOffices: ["police"],
    fields: [
      {
        key: "crimeType",
        label: "Type of crime",
        type: "select",
        required: true,
        options: ["Theft", "Assault", "Robbery", "Vandalism", "Burglary", "Fraud", "Other"],
      },
      {
        key: "incidentDateTime",
        label: "When did it happen?",
        type: "text",
        required: true,
        placeholder: "e.g. Today 3:30 PM / 12 Mar 2026, 8:00 PM",
      },
      {
        key: "incidentPlace",
        label: "Exact place of incident",
        type: "text",
        required: true,
        placeholder: "Street, area, landmark",
      },
      {
        key: "suspectDescription",
        label: "Suspect description (optional)",
        type: "textarea",
        placeholder: "Appearance, clothing, vehicle, direction of escape…",
        multiline: true,
      },
      {
        key: "description",
        label: "What happened?",
        type: "textarea",
        required: true,
        placeholder: "Describe the crime in detail",
        multiline: true,
      },
      ...COMMON_WITNESS_FIELDS,
    ],
  },
  {
    category: "accident",
    title: "Accident Report",
    icon: "🚨",
    color: "#fff7ed",
    accent: "#ea580c",
    subtitle: "Road, workplace, or home accidents",
    suggestedOffices: ["police", "ambulance", "hospital"],
    fields: [
      {
        key: "accidentType",
        label: "Accident type",
        type: "select",
        required: true,
        options: ["Road Accident", "Workplace Accident", "Home Accident", "Other"],
      },
      {
        key: "vehicleType",
        label: "Vehicle type (if road accident)",
        type: "text",
        placeholder: "e.g. Car, bus, motorcycle",
      },
      {
        key: "plateNumber",
        label: "Vehicle plate number (optional)",
        type: "text",
        placeholder: "e.g. DHA-1234",
      },
      {
        key: "numInjured",
        label: "Number of injured people",
        type: "number",
        required: true,
        placeholder: "e.g. 2",
      },
      {
        key: "severeInjury",
        label: "Anyone severely injured?",
        type: "radio",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "bleeding",
        label: "Bleeding or unconscious victims?",
        type: "radio",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "roadBlocked",
        label: "Road blocked?",
        type: "radio",
        options: ["Yes", "No"],
      },
      {
        key: "description",
        label: "Describe the accident",
        type: "textarea",
        required: true,
        multiline: true,
      },
      ...COMMON_WITNESS_FIELDS,
    ],
  },
  {
    category: "fire",
    title: "Fire Report",
    icon: "🔥",
    color: "#fef2f2",
    accent: "#dc2626",
    subtitle: "Building, vehicle, or outdoor fires",
    suggestedOffices: ["fire_service", "ambulance", "police"],
    fields: [
      {
        key: "fireType",
        label: "Fire type",
        type: "select",
        required: true,
        options: ["Building fire", "Vehicle fire", "Electrical fire", "Gas leak / explosion risk", "Other"],
      },
      {
        key: "peopleTrapped",
        label: "Anyone trapped inside?",
        type: "radio",
        required: true,
        options: ["Yes", "No", "Unknown"],
      },
      {
        key: "smokeVisible",
        label: "Heavy smoke or spreading?",
        type: "radio",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "incidentPlace",
        label: "Fire location details",
        type: "text",
        required: true,
        placeholder: "Building name, floor, nearby landmark",
      },
      {
        key: "description",
        label: "Describe the situation",
        type: "textarea",
        required: true,
        multiline: true,
      },
      ...COMMON_WITNESS_FIELDS,
    ],
  },
  {
    category: "harassment",
    title: "Harassment Report",
    icon: "⚠️",
    color: "#fdf2f8",
    accent: "#db2777",
    subtitle: "Workplace, street, domestic, or online harassment",
    suggestedOffices: ["police", "volunteer"],
    fields: [
      {
        key: "harassmentType",
        label: "Harassment type",
        type: "select",
        required: true,
        options: ["Workplace", "Street / public", "Domestic", "Online / digital", "Sexual harassment", "Other"],
      },
      {
        key: "ongoingThreat",
        label: "Is the threat ongoing?",
        type: "radio",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "victimSafe",
        label: "Is the victim in a safe place now?",
        type: "radio",
        required: true,
        options: ["Yes", "No", "Unknown"],
      },
      {
        key: "suspectRelation",
        label: "Relationship to harasser (optional)",
        type: "text",
        placeholder: "e.g. Colleague, neighbour, unknown",
      },
      {
        key: "incidentPlace",
        label: "Where did this occur?",
        type: "text",
        required: true,
      },
      {
        key: "description",
        label: "Describe what happened",
        type: "textarea",
        required: true,
        multiline: true,
      },
      ...COMMON_WITNESS_FIELDS,
    ],
  },
  {
    category: "medical",
    title: "Medical Emergency",
    icon: "🏥",
    color: "#f0fdf4",
    accent: "#16a34a",
    subtitle: "Urgent medical help needed",
    suggestedOffices: ["ambulance", "hospital"],
    fields: [
      {
        key: "emergencyType",
        label: "Emergency type",
        type: "select",
        required: true,
        options: [
          "Cardiac / chest pain",
          "Serious injury",
          "Unconscious person",
          "Breathing difficulty",
          "Stroke symptoms",
          "Pregnancy emergency",
          "Other",
        ],
      },
      {
        key: "patientName",
        label: "Patient name (optional)",
        type: "text",
        placeholder: "Who needs help?",
      },
      {
        key: "patientAge",
        label: "Patient age (optional)",
        type: "text",
        placeholder: "e.g. 45",
      },
      {
        key: "conscious",
        label: "Is the patient conscious?",
        type: "radio",
        required: true,
        options: ["Yes", "No", "Unknown"],
      },
      {
        key: "numPatients",
        label: "Number of patients",
        type: "number",
        required: true,
        placeholder: "1",
      },
      {
        key: "symptoms",
        label: "Current symptoms",
        type: "textarea",
        required: true,
        placeholder: "Describe symptoms and when they started",
        multiline: true,
      },
      {
        key: "description",
        label: "Additional details",
        type: "textarea",
        multiline: true,
        placeholder: "Allergies, medicines taken, medical history if known",
      },
    ],
  },
  {
    category: "missing_person",
    title: "Missing Person Report",
    icon: "🔍",
    color: "#f5f3ff",
    accent: "#7c3aed",
    subtitle: "Report a missing child or adult",
    suggestedOffices: ["police", "volunteer"],
    fields: [
      {
        key: "missingPersonName",
        label: "Missing person's full name",
        type: "text",
        required: true,
      },
      {
        key: "missingPersonAge",
        label: "Age",
        type: "text",
        required: true,
        placeholder: "e.g. 12",
      },
      {
        key: "missingPersonGender",
        label: "Gender",
        type: "select",
        required: true,
        options: ["Male", "Female", "Other", "Prefer not to say"],
      },
      {
        key: "relationshipToReporter",
        label: "Your relationship to missing person",
        type: "text",
        required: true,
        placeholder: "e.g. Parent, sibling, friend",
      },
      {
        key: "lastSeenDateTime",
        label: "Last seen date & time",
        type: "text",
        required: true,
        placeholder: "e.g. 18 Mar 2026, 4:00 PM",
      },
      {
        key: "lastSeenPlace",
        label: "Last seen location",
        type: "text",
        required: true,
        placeholder: "Address or landmark",
      },
      {
        key: "clothingDescription",
        label: "Clothing & appearance",
        type: "textarea",
        required: true,
        placeholder: "What were they wearing? Height, hair, marks?",
        multiline: true,
      },
      {
        key: "description",
        label: "Circumstances / extra details",
        type: "textarea",
        required: true,
        multiline: true,
      },
      ...COMMON_WITNESS_FIELDS,
    ],
  },
];

export function getReportConfig(category: string): ReportTypeConfig | undefined {
  return REPORT_TYPES.find((r) => r.category === category);
}

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  crime: "Crime Report",
  accident: "Accident Report",
  fire: "Fire Report",
  harassment: "Harassment Report",
  medical: "Medical Emergency",
  missing_person: "Missing Person",
};
