import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { AmbulanceRequestStatus } from "../types";

export const createAmbulanceRequest = async (payload: {
  userId: string;
  userName: string;
  category: "single" | "mass_casualty";
  emergencyType: string;
  patientName?: string;
  age?: string;
  bloodGroup?: string;
  knownDisease?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  ambulanceType?: string;
  ambulanceCount?: number;
  incidentType?: string;
  estimatedCasualties?: string;
  locationDetails?: string;
  latitude?: number | null;
  longitude?: number | null;
  addressLine?: string;
}) => {
  const ref = await addDoc(collection(db, "ambulance_requests"), {
    userId: payload.userId,
    userName: payload.userName,
    category: payload.category,
    emergencyType: payload.emergencyType || "",
    patientName: payload.patientName ?? "",
    age: payload.age ?? "",
    bloodGroup: payload.bloodGroup ?? "",
    knownDisease: payload.knownDisease ?? "",
    emergencyContactName: payload.emergencyContactName ?? "",
    emergencyContactNumber: payload.emergencyContactNumber ?? "",
    ambulanceType: payload.ambulanceType ?? "",
    ambulanceCount: payload.ambulanceCount ?? 1,
    incidentType: payload.incidentType ?? "",
    estimatedCasualties: payload.estimatedCasualties ?? "",
    locationDetails: payload.locationDetails ?? "",
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    addressLine: payload.addressLine ?? "",
    ambulanceLatitude: null,
    ambulanceLongitude: null,
    operatorMessage: "Request received. An operator will respond shortly.",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
};

export const updateAmbulanceRequestStatus = async (
  requestId: string,
  status: AmbulanceRequestStatus,
  extras?: {
    operatorMessage?: string;
    ambulanceLatitude?: number | null;
    ambulanceLongitude?: number | null;
  }
) => {
  const patch: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (extras?.operatorMessage !== undefined) patch.operatorMessage = extras.operatorMessage;
  if (extras?.ambulanceLatitude !== undefined) patch.ambulanceLatitude = extras.ambulanceLatitude;
  if (extras?.ambulanceLongitude !== undefined) patch.ambulanceLongitude = extras.ambulanceLongitude;
  await updateDoc(doc(db, "ambulance_requests", requestId), patch);
};

/** Operator updates: only include fields that are defined. */
export const updateAmbulanceRequestOperator = async (
  requestId: string,
  patch: {
    status?: AmbulanceRequestStatus;
    operatorMessage?: string;
    ambulanceLatitude?: number | null;
    ambulanceLongitude?: number | null;
  }
) => {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.operatorMessage !== undefined) data.operatorMessage = patch.operatorMessage;
  if (patch.ambulanceLatitude !== undefined) data.ambulanceLatitude = patch.ambulanceLatitude;
  if (patch.ambulanceLongitude !== undefined) data.ambulanceLongitude = patch.ambulanceLongitude;
  await updateDoc(doc(db, "ambulance_requests", requestId), data);
};

/** Citizen updates pickup location while tracking (live share with dispatch). */
export const updateAmbulanceRequestPickupLocation = async (
  requestId: string,
  latitude: number,
  longitude: number
) => {
  await updateDoc(doc(db, "ambulance_requests", requestId), {
    latitude,
    longitude,
    updatedAt: serverTimestamp(),
  });
};

/** Operator → citizen inbox (Notifications tab). `reportedByUid` must be recipient citizen uid. */
export const pushAmbulanceDispatchNotification = async (params: {
  ambulanceRequestId: string;
  recipientUserId: string;
  title: string;
  body: string;
  ambulanceStatus: AmbulanceRequestStatus;
}) => {
  await addDoc(collection(db, "notifications"), {
    type: "ambulanceUpdate",
    ambulanceRequestId: params.ambulanceRequestId,
    title: params.title,
    body: params.body,
    reportedBy: "Dispatch",
    reportedByUid: params.recipientUserId,
    ambulanceStatus: params.ambulanceStatus,
    severity: "high",
    read: false,
    createdAt: serverTimestamp(),
  });
};
