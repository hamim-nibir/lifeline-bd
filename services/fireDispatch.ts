import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { reverseGeocode } from "./geocoding";
import { FireStationCandidate, etaRangeFromDistanceKm, mapsDirectionsUrl } from "./fireStations";
import type { FireSeverity } from "../store/fireRequestStore";
import { ensureIncidentForDispatch } from "./chat";

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
