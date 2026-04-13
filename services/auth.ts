import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AccountType } from "../types";

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
    bloodType: null,
    phone: null,
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
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Logout error:", err);
  }
};

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};