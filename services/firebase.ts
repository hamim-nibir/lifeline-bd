// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACLMpoK68wPEKSm4pODsNuc-_7cPAmw2Y",
  authDomain: "lifeline-bd-51bfc.firebaseapp.com",
  projectId: "lifeline-bd-51bfc",
  storageBucket: "lifeline-bd-51bfc.firebasestorage.app",
  messagingSenderId: "912068291483",
  appId: "1:912068291483:web:d95ea873b6931034768f3e"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;