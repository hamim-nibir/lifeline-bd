import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { PoliceReport } from "../types";

export const submitPoliceReport = async (
  report: Omit<PoliceReport, "id" | "createdAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, "policeReports"), {
    ...report,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const sendSOSAlert = async (
  uid: string,
  latitude: number,
  longitude: number
): Promise<string> => {
  const docRef = await addDoc(collection(db, "policeReports"), {
    uid,
    type: "other",
    description: "SOS ALERT — Immediate police assistance needed!",
    location: { latitude, longitude },
    evidenceUrls: [],
    status: "pending",
    isSOS: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserPoliceReports = async (uid: string): Promise<PoliceReport[]> => {
  const q = query(
    collection(db, "policeReports"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as PoliceReport[];
};