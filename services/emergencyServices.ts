import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { QuickEmergencyService } from "../types";

const DEFAULT_SERVICE_ROUTES: Record<string, string> = {
  "medical-emergency": "/(feat)/ambulance-emergency",
  "fire-emergency": "/(feat)/fire-service",
};

const QUICK_EMERGENCY_SERVICE_SEED: QuickEmergencyService[] = [
  {
    id: "medical-emergency",
    title: "Ambulance",
    subtitle: "Medical Emergency",
    description: "Rapid medical support for urgent health incidents.",
    hotline: "999",
    badge: "Fast Dispatch",
    imageKey: "ambulance",
    route: "/(feat)/ambulance-emergency",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "fire-emergency",
    title: "Fire Service",
    subtitle: "Fire & Rescue",
    description: "Report fires and request rescue support instantly.",
    hotline: "999",
    badge: "24/7 Coverage",
    imageKey: "fire",
    route: "/(feat)/fire-service",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "police-help",
    title: "Police",
    subtitle: "Law Enforcement",
    description: "Reach the nearest police response team quickly.",
    hotline: "999",
    badge: "Trusted Response",
    imageKey: "police",
    route: null,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "unified-service",
    title: "Unified Service",
    subtitle: "All Emergency Services",
    description: "One touch access to all major emergency channels.",
    hotline: "999",
    badge: "One Hotline",
    imageKey: "unified",
    route: null,
    isActive: true,
    sortOrder: 4,
  },
];

const normalizeQuickEmergencyService = (
  id: string,
  data: Partial<QuickEmergencyService>
): QuickEmergencyService | null => {
  if (!data.title || !data.subtitle || !data.description || !data.hotline || !data.badge || !data.imageKey) {
    return null;
  }

  return {
    id,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    hotline: data.hotline,
    badge: data.badge,
    imageKey: data.imageKey,
    route: data.route ?? DEFAULT_SERVICE_ROUTES[id] ?? null,
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? 999,
  };
};

export const getQuickEmergencyServices = async (): Promise<QuickEmergencyService[]> => {
  try {
    const quickServicesQuery = query(
      collection(db, "quickEmergencyServices"),
      where("isActive", "==", true),
      orderBy("sortOrder", "asc"),
      limit(4)
    );

    const snapshot = await getDocs(quickServicesQuery);
    const services = snapshot.docs
      .map((docSnap) =>
        normalizeQuickEmergencyService(docSnap.id, docSnap.data() as Partial<QuickEmergencyService>)
      )
      .filter((service): service is QuickEmergencyService => Boolean(service));

    if (services.length > 0) {
      return services;
    }
  } catch (error) {
    console.warn("getQuickEmergencyServices fallback:", error);
  }

  return QUICK_EMERGENCY_SERVICE_SEED;
};

export { QUICK_EMERGENCY_SERVICE_SEED };
