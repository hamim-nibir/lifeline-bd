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

export type EmergencyServiceImageKey =
  | "ambulance"
  | "fire"
  | "police"
  | "unified";

export interface QuickEmergencyService {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  hotline: string;
  badge: string;
  imageKey: EmergencyServiceImageKey;
  route?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export type SOSEventStatus = "active" | "resolved" | "cancelled";

/** Citizen SOS lifecycle after dispatch (operator acknowledgement). */
export type SOSPhase =
  | "awaiting_operator"
  | "operator_accepted"
  | "cancelled"
  | "resolved";

export interface SOSEvent {
  id: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  address: string;
  status: SOSEventStatus;
  triggeredAt: any;
  resolvedAt: any;
  source: "app";
  /** Linked dashboard alert document id */
  sosAlertId?: string;
  sosPhase?: SOSPhase;
  operatorAccepted?: boolean;
  acceptedAt?: any;
  acceptedByOperatorUid?: string;
  /** Shown to user after operator accepts */
  responderStatus?: string;
  etaMinutesMin?: number;
  etaMinutesMax?: number;
  lastLocationAt?: any;
}

export interface UserEmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnSOS: boolean;
  createdAt?: any;
}

export type AmbulanceRequestStatus =
  | "pending"
  | "accepted"
  | "dispatched"
  | "completed"
  | "cancelled";

export interface AmbulanceRequest {
  id: string;
  userId: string;
  userName: string;
  category: "single" | "mass_casualty";
  emergencyType: string;
  patientName: string;
  age: string;
  bloodGroup: string;
  knownDisease: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  ambulanceType: string;
  ambulanceCount: number;
  incidentType: string;
  estimatedCasualties: string;
  locationDetails: string;
  /** GPS from device when permission granted (pickup / patient site) */
  latitude?: number | null;
  longitude?: number | null;
  addressLine?: string;
  /** Live ambulance position (set by operator / dispatch) */
  ambulanceLatitude?: number | null;
  ambulanceLongitude?: number | null;
  /** Shown to citizen in-app when operator updates */
  operatorMessage?: string;
  status: AmbulanceRequestStatus;
  createdAt: any;
  updatedAt: any;
}

// Training Platform Types
export type CourseLevel = "Beginner" | "Intermediate";
export type CourseStatus = "locked" | "in-progress" | "completed";
export type EnrollmentStatus = "locked" | "in-progress" | "completed";

export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  level: CourseLevel;
  icon: string;
  thumbnail: string;
  backgroundColor: string;
  duration: number;
  videoCount: number;
  enrolledCount: number;
  completionRate: number;
  createdAt: any;
  updatedAt: any;
}

export interface TrainingVideo {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  order: number;
  thumbnail: string;
  createdAt: any;
}

export interface TrainingEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number;
  lastWatchedVideoId: string | null;
  lastWatchedAt: any;
  enrolledAt: any;
  completedAt: any | null;
  certificateId: string | null;
}

export interface TrainingCertificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: any;
  expiresAt: any;
  status: "active" | "expired";
}

export interface TrainingAchievement {
  id: string;
  userId?: string;
  achievementId: string;
  title?: string;
  description?: string;
  icon?: string;
  unlockedAt?: any;
  progress: number;
  requirementType?: "course_completion";
  courseId?: string;
}

export interface TrainingProgressHistory {
  id: string;
  userId: string;
  courseId: string;
  videoId: string;
  watchedDuration: number;
  totalDuration: number;
  progress: number;
  timestamp: any;
}