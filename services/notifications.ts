import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const markNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
};
