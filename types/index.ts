export type AccountType = "operator" | "volunteer" | "citizen";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
export type BloodPressure = "High" | "Low" | "Normal" | "";
export type TrackingAccuracy = "High Accuracy" | "Balanced" | "Battery Saving";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface UserProfile {
  uid: string;
  name: string;
  nickname: string;
  email: string;
  accountType: AccountType;

  // personal
  dateOfBirth: string;
  phone: string;
  profilePhoto: string | null;

  // health
  bloodGroup: BloodGroup;
  bloodPressure: BloodPressure;
  height: string;
  weight: string;
  knownDiseases: string;
  allergies: string;
  currentMedications: string;

  // privacy
  showHealthInfo: boolean;
  showContactInfo: boolean;
  dataSharing: boolean;
  twoFactorAuth: boolean;
  emergencyAccess: boolean;

  // location
  shareRealtimeLocation: boolean;
  locationHistory: boolean;
  trackingAccuracy: TrackingAccuracy;

  // verification
  verificationStatus: VerificationStatus;
  nidNumber: string | null;
  nidSubmittedAt: string | null;
  verifiedAt: string | null;

  bloodType: string | null;
  location: string | null;
  isDonor: boolean;
  createdAt: any;
}

export interface AuthFormData {
  name?: string;
  nickname?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  facebook: string;
}

export interface PoliceReport {
  id?: string;
  uid: string;
  type: "theft" | "harassment" | "violence" | "missing" | "accident" | "suspicious" | "other";
  description: string;
  location: { latitude: number; longitude: number };
  evidenceUrls: string[];
  status: "pending" | "acknowledged" | "resolved";
  isSOS: boolean;
  createdAt?: any;
}