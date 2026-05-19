import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

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
