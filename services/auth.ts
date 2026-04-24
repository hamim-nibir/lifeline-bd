import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import {
  doc, setDoc, getDoc,
  updateDoc, serverTimestamp,
  collection, addDoc, query,
  where, getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { AccountType, VerificationStatus } from "../types";

export const registerUser = async (
  name: string,
  nickname: string,
  email: string,
  password: string,
  accountType: AccountType
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await updateProfile(user, { displayName: nickname });
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    nickname,
    email,
    accountType,
    dateOfBirth: "",
    phone: "",
    profilePhoto: null,
    bloodGroup: "",
    bloodPressure: "",
    height: "",
    weight: "",
    knownDiseases: "",
    allergies: "",
    currentMedications: "",
    showHealthInfo: true,
    showContactInfo: true,
    dataSharing: false,
    twoFactorAuth: false,
    emergencyAccess: true,
    shareRealtimeLocation: true,
    locationHistory: true,
    trackingAccuracy: "High Accuracy",
    verificationStatus: "unverified",
    nidNumber: null,
    nidSubmittedAt: null,
    verifiedAt: null,
    bloodType: null,
    location: null,
    isDonor: false,
    createdAt: serverTimestamp(),
  });
  return user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  try { await signOut(auth); } catch (err) { console.warn("Logout error:", err); }
};

export const getUserProfile = async (uid: string) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("getUserProfile failed:", err);
    return null;
  }
};

export const updateUserProfile = async (uid: string, data: Partial<any>) => {
  await updateDoc(doc(db, "users", uid), data);
};

export const submitVerificationRequest = async (
  uid: string,
  name: string,
  nickname: string,
  nidNumber: string
) => {
  // check for existing pending request
  const q = query(
    collection(db, "verificationRequests"),
    where("uid", "==", uid),
    where("status", "==", "pending")
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error("You already have a pending verification request.");
  }

  // save request
  await addDoc(collection(db, "verificationRequests"), {
    uid,
    name,
    nickname,
    nidNumber,
    status: "pending",
    submittedAt: serverTimestamp(),
  });

  // mark user as pending
  await updateDoc(doc(db, "users", uid), {
    verificationStatus: "pending",
    nidNumber,
    nidSubmittedAt: new Date().toISOString(),
  });
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};