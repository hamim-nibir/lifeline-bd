import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { SOSEvent, UserEmergencyContact } from "../types";

const toDateValue = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value?.toDate === "function") return value.toDate();
  return null;
};

export const getLastSOSEvent = async (userId: string): Promise<SOSEvent | null> => {
  try {
    const q = query(
      collection(db, "sos_events"),
      where("userId", "==", userId),
      orderBy("triggeredAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<SOSEvent, "id">) };
  } catch (error) {
    console.warn("getLastSOSEvent skipped:", error);
    return null;
  }
};

export const triggerSOS = async (payload: {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  address: string;
}) => {
  const last = await getLastSOSEvent(payload.userId);

  if (last && last.status === "active") {
    throw new Error("SOS already active. Cancel SOS before sending another alert.");
  }

  const eventRef = doc(collection(db, "sos_events"));
  const alertRef = doc(collection(db, "sos_alerts"));

  const batch = writeBatch(db);

  batch.set(eventRef, {
    userId: payload.userId,
    userName: payload.userName,
    latitude: payload.latitude,
    longitude: payload.longitude,
    address: payload.address,
    status: "active",
    source: "app",
    triggeredAt: serverTimestamp(),
    resolvedAt: null,
    sosPhase: "awaiting_operator",
    operatorAccepted: false,
    responderStatus: "Waiting for operator confirmation",
    etaMinutesMin: 5,
    etaMinutesMax: 8,
    sosAlertId: alertRef.id,
    lastLocationAt: serverTimestamp(),
  });

  batch.set(alertRef, {
    type: "sosAlert",
    title: "SOS Alert Triggered",
    body: `${payload.userName} triggered SOS from ${payload.address}`,
    reportedByUid: payload.userId,
    reportedBy: payload.userName,
    severity: "high",
    read: false,
    operatorAccepted: false,
    sosCancelled: false,
    createdAt: serverTimestamp(),
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
      mapsLink: `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`,
    },
    sosEventId: eventRef.id,
  });

  await batch.commit();

  return eventRef.id;
};

export const updateSOSLocation = async (
  sosEventId: string,
  latitude: number,
  longitude: number,
  address: string
) => {
  await updateDoc(doc(db, "sos_events", sosEventId), {
    latitude,
    longitude,
    address,
    lastLocationAt: serverTimestamp(),
  });
};

export const cancelSOS = async (
  sosEventId: string,
  opts?: { userName?: string; addressHint?: string }
) => {
  const userName = opts?.userName ?? "User";
  await updateDoc(doc(db, "sos_events", sosEventId), {
    status: "cancelled",
    resolvedAt: serverTimestamp(),
  });

  try {
    const q = query(
      collection(db, "sos_alerts"),
      where("sosEventId", "==", sosEventId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, {
        sosCancelled: true,
        cancelledAt: serverTimestamp(),
        title: "SOS Cancelled",
        body: `${userName} cancelled their SOS${
          opts?.addressHint ? ` (${opts.addressHint})` : ""
        }.`,
      });
    }
  } catch (error) {
    console.warn("cancelSOS alert mirror skipped:", error);
  }
};

/** Operator accepts — updates citizen SOS event and dashboard alert (real-time for user). */
export const acceptSOSByOperator = async (payload: {
  sosEventId: string;
  sosAlertId: string;
  operatorUid: string;
}) => {
  const evSnap = await getDoc(doc(db, "sos_events", payload.sosEventId));
  if (!evSnap.exists()) {
    throw new Error("SOS event not found.");
  }
  const ev = evSnap.data() as { status?: string };
  if (ev.status !== "active") {
    throw new Error("This SOS is no longer active.");
  }

  const batch = writeBatch(db);
  batch.update(doc(db, "sos_events", payload.sosEventId), {
    sosPhase: "operator_accepted",
    operatorAccepted: true,
    acceptedAt: serverTimestamp(),
    acceptedByOperatorUid: payload.operatorUid,
    responderStatus: "Dispatched and en route",
  });
  batch.update(doc(db, "sos_alerts", payload.sosAlertId), {
    operatorAccepted: true,
    acceptedAt: serverTimestamp(),
    title: "SOS Accepted — Responder dispatched",
    body: "Operator accepted this SOS. Help is on the way.",
    read: false,
  });
  await batch.commit();
};

export const getSOSHistory = async (userId: string): Promise<SOSEvent[]> => {
  try {
    const q = query(
      collection(db, "sos_events"),
      where("userId", "==", userId),
      orderBy("triggeredAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SOSEvent, "id">) }));
  } catch (error) {
    console.warn("getSOSHistory failed:", error);
    return [];
  }
};

const mapContactDocs = (snap: Awaited<ReturnType<typeof getDocs>>) =>
  snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserEmergencyContact, "id">),
  }));

const sortContactsByCreatedDesc = (list: UserEmergencyContact[]) =>
  [...list].sort((a, b) => {
    const ta =
      a.createdAt instanceof Timestamp
        ? a.createdAt.toMillis()
        : typeof a.createdAt?.toMillis === "function"
          ? a.createdAt.toMillis()
          : 0;
    const tb =
      b.createdAt instanceof Timestamp
        ? b.createdAt.toMillis()
        : typeof b.createdAt?.toMillis === "function"
          ? b.createdAt.toMillis()
          : 0;
    return tb - ta;
  });

export const getEmergencyContacts = async (userId: string): Promise<UserEmergencyContact[]> => {
  try {
    const q = query(
      collection(db, "emergency_contacts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return mapContactDocs(snap);
  } catch (error: any) {
    console.warn("getEmergencyContacts ordered query failed, trying fallback:", error);

    try {
      const qFallback = query(
        collection(db, "emergency_contacts"),
        where("userId", "==", userId),
        limit(30)
      );
      const snap = await getDocs(qFallback);
      return sortContactsByCreatedDesc(mapContactDocs(snap)).slice(0, 20);
    } catch (e2) {
      console.warn("getEmergencyContacts fallback failed:", e2);
      return [];
    }
  }
};

export const addEmergencyContact = async (
  contact: Omit<UserEmergencyContact, "id" | "createdAt">
) => {
  const payload = {
    userId: contact.userId,
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    relationship: contact.relationship.trim(),
    notifyOnSOS: Boolean(contact.notifyOnSOS),
    createdAt: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, "emergency_contacts"), payload);
  } catch (error: any) {
    console.warn("addEmergencyContact failed:", error);
    const code = error?.code;
    if (code === "permission-denied") {
      throw new Error(
        "Permission denied. Deploy Firestore rules for emergency_contacts and ensure you are signed in."
      );
    }
    throw new Error(error?.message ?? "Could not save emergency contact.");
  }
};

export const updateEmergencyContact = async (
  contactId: string,
  updates: Pick<UserEmergencyContact, "userId" | "name" | "phone" | "relationship" | "notifyOnSOS">
) => {
  try {
    await updateDoc(doc(db, "emergency_contacts", contactId), {
      userId: updates.userId,
      name: updates.name.trim(),
      phone: updates.phone.trim(),
      relationship: updates.relationship.trim(),
      notifyOnSOS: Boolean(updates.notifyOnSOS),
    });
  } catch (error: any) {
    console.warn("updateEmergencyContact failed:", error);
    if (error?.code === "permission-denied") {
      throw new Error("Permission denied. Check Firestore rules for emergency_contacts.");
    }
    throw new Error(error?.message ?? "Could not update contact.");
  }
};

export const deleteEmergencyContact = async (contactId: string) => {
  try {
    await deleteDoc(doc(db, "emergency_contacts", contactId));
  } catch (error: any) {
    console.warn("deleteEmergencyContact failed:", error);
    if (error?.code === "permission-denied") {
      throw new Error("Permission denied. Check Firestore rules for emergency_contacts.");
    }
    throw new Error(error?.message ?? "Could not delete contact.");
  }
};

export const notifyEmergencyContacts = async (payload: {
  userName: string;
  latitude: number;
  longitude: number;
  address?: string;
  contacts: UserEmergencyContact[];
}) => {
  const activeContacts = payload.contacts.filter((item) => item.notifyOnSOS);
  if (activeContacts.length === 0) return;

  const mapsUrl = `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
  const locationLine = payload.address?.trim()
    ? `${payload.address.trim()} — Map: ${mapsUrl}`
    : mapsUrl;
  const message = `${payload.userName} has sent an SOS alert. Location: ${locationLine}. Please respond immediately.`;

  // Placeholder for Twilio / push integration via backend.
  console.log("SOS SMS payload", {
    to: activeContacts.map((c) => c.phone),
    message,
  });
};

export const notifyEmergencyContactsCancelled = async (payload: {
  userName: string;
  contacts: UserEmergencyContact[];
}) => {
  const activeContacts = payload.contacts.filter((item) => item.notifyOnSOS);
  if (activeContacts.length === 0) return;
  const message = `${payload.userName} has cancelled their SOS alert.`;
  console.log("SOS cancel notify payload", {
    to: activeContacts.map((c) => c.phone),
    message,
  });
};
