import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { reverseGeocode } from "./geocoding";
import { FireStationCandidate, etaRangeFromDistanceKm, mapsDirectionsUrl } from "./fireStations";
import type { FireSeverity } from "../store/fireRequestStore";
import { ensureIncidentForDispatch } from "./chat";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export type CreateFireDispatchInput = {
  uid: string;
  reportedBy: string;
  serviceId: string;
  serviceTitle: string;
  unit: string;
  serviceDesc: string;
  userLat: number;
  userLng: number;
  locationText?: string;
  station: FireStationCandidate;
  severityLevel: FireSeverity;
  contactNumber: string;
  peopleAffected: number | null;
  notes: string;
};

export async function createFireDispatchRequest(input: CreateFireDispatchInput) {
  const {
    uid,
    reportedBy,
    serviceId,
    serviceTitle,
    unit,
    userLat,
    userLng,
    station,
    severityLevel,
    contactNumber,
    peopleAffected,
    notes,
  } = input;

  let locationText = input.locationText ?? `Near ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;
  if (!input.locationText) {
    try {
      const address = await reverseGeocode({ latitude: userLat, longitude: userLng });
      if (address?.display_name) locationText = address.display_name;
    } catch {
      /* keep fallback */
    }
  }

  const mapsLink = mapsDirectionsUrl(userLat, userLng, station.latitude, station.longitude);
  const etaText = etaRangeFromDistanceKm(station.distanceKm);
  const distanceKm = Math.round(station.distanceKm * 10) / 10;

  const ref = await addDoc(collection(db, "fire-dispatch"), {
    uid,
    reportedBy,
    serviceId,
    serviceTitle,
    unit,
    locationText,
    stationAddress: station.address,
    mapsLink,
    selectedStationName: station.name,
    stationLat: station.latitude,
    stationLng: station.longitude,
    userLat,
    userLng,
    stationSource: station.source,
    statusIndex: 0,
    distanceKm,
    etaText,
    assignedUnit: null,
    incidentDetails: {
      incidentType: serviceTitle,
      severityLevel,
      peopleAffected,
      peopleTrapped: peopleAffected != null && peopleAffected > 0 ? "Yes" : "No",
      notes: notes.slice(0, 500),
      contactNumber,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await ensureIncidentForDispatch(ref.id, uid, severityLevel, serviceTitle);
  } catch (err) {
    console.warn("Incident record for chat failed:", err);
  }

  try {
    await addDoc(collection(db, "notifications"), {
      type: "fireDispatch",
      dispatchId: ref.id,
      uid,
      title: "New fire dispatch request",
      body: `${reportedBy} — ${serviceTitle} (${formatSeverity(severityLevel)}) → ${station.name}`,
      severity: severityLevel === "critical" ? "high" : "normal",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Operator notification failed:", err);
  }

  return { id: ref.id, locationText, etaText, distanceKm };
}

function formatSeverity(level: FireSeverity): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  return "Medium";
}

export const dispatchFireService = async (payload: {
  service: string;
  userId: string;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? "Dispatch request failed.");
    }
    return data;
  } catch (error: any) {
    // Fallback for mobile devices where localhost backend is unreachable.
    const ref = await addDoc(collection(db, "fire_dispatches"), {
      service: payload.service,
      userId: payload.userId,
      status: "dispatched",
      source: "app-fallback",
      incidentType: "Building Fire",
      severity: "Medium",
      peopleTrapped: "No",
      notes: "",
      contactNumber: "",
      requesterLocation: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      ok: true,
      dispatchId: ref.id,
      service: payload.service,
      userId: payload.userId,
      status: "dispatched",
      message: "Dispatch created with in-app fallback.",
      fallback: true,
      networkError: error?.message ?? "Network request failed",
    };
  }
};
