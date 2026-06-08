import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { updateAmbulanceRequestPickupLocation } from "../../services/ambulance";
import { useAuthStore } from "../../store/authStore";
import { AmbulanceRequest, AmbulanceRequestStatus } from "../../types";
import { haversineKm } from "../../utils/geo";

const STATUS_ORDER: AmbulanceRequestStatus[] = [
  "pending",
  "accepted",
  "dispatched",
  "completed",
  "cancelled",
];

const stepLabel = (status: AmbulanceRequestStatus) => {
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Arrived";
  if (status === "dispatched") return "On the way";
  if (status === "accepted") return "Ambulance assigned";
  return "Request sent";
};

export default function AmbulanceTrackingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = params.requestId ?? "";

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<AmbulanceRequest | null>(null);
  const lastNotifiedStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!requestId || !user?.uid) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, "ambulance_requests", requestId), (snap) => {
      if (!snap.exists()) {
        setReq(null);
        setLoading(false);
        return;
      }
      const data = { id: snap.id, ...(snap.data() as Omit<AmbulanceRequest, "id">) };
      setReq(data);
      setLoading(false);

      const st = data.status;
      if (lastNotifiedStatus.current !== null && lastNotifiedStatus.current !== st) {
        const msg = data.operatorMessage?.trim() || `Status updated: ${st}`;
        Alert.alert("Ambulance update", msg);
      }
      lastNotifiedStatus.current = st;
    });
    return () => unsub();
  }, [requestId, user?.uid]);

  useEffect(() => {
    if (!requestId) return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
        async (pos) => {
          try {
            await updateAmbulanceRequestPickupLocation(
              requestId,
              pos.coords.latitude,
              pos.coords.longitude
            );
          } catch {
            /* ignore */
          }
        }
      );
    })();
    return () => sub?.remove();
  }, [requestId]);

  const pickup = useMemo(() => {
    if (!req?.latitude || !req?.longitude) return null;
    if (Math.abs(req.latitude) < 1e-6 && Math.abs(req.longitude) < 1e-6) return null;
    return { latitude: req.latitude, longitude: req.longitude };
  }, [req?.latitude, req?.longitude]);

  const ambulancePos = useMemo(() => {
    if (!req?.ambulanceLatitude || !req?.ambulanceLongitude) return null;
    return { latitude: req.ambulanceLatitude, longitude: req.ambulanceLongitude };
  }, [req?.ambulanceLatitude, req?.ambulanceLongitude]);

  const distanceKm = useMemo(() => {
    if (!pickup || !ambulancePos) return null;
    return haversineKm(
      pickup.latitude,
      pickup.longitude,
      ambulancePos.latitude,
      ambulancePos.longitude
    );
  }, [pickup, ambulancePos]);

  const mapRegion = useMemo(() => {
    if (pickup && ambulancePos) {
      const minLat = Math.min(pickup.latitude, ambulancePos.latitude);
      const maxLat = Math.max(pickup.latitude, ambulancePos.latitude);
      const minLng = Math.min(pickup.longitude, ambulancePos.longitude);
      const maxLng = Math.max(pickup.longitude, ambulancePos.longitude);
      const pad = 0.012;
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.02, (maxLat - minLat) * 2 + pad),
        longitudeDelta: Math.max(0.02, (maxLng - minLng) * 2 + pad),
      };
    }
    if (pickup) {
      return {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }
    return {
      latitude: 23.8103,
      longitude: 90.4125,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [pickup, ambulancePos]);

  const timeline = useMemo(() => {
    if (!req) return [];
    const st = req.status;
    if (st === "cancelled") {
      return [
        { key: "sent", done: true, label: "Request sent", sub: "", active: false },
        { key: "can", done: true, label: "Cancelled", sub: req.operatorMessage ?? "", active: false },
      ];
    }
    const idx = STATUS_ORDER.indexOf(st);
    const labels = [
      { key: "sent", label: "Request sent", minIdx: 0 },
      { key: "asg", label: "Ambulance assigned", minIdx: 1 },
      { key: "way", label: "On the way", minIdx: 2 },
      { key: "arr", label: "Arrived", minIdx: 3 },
    ];
    return labels.map((row) => {
      const done = idx >= row.minIdx;
      const active = idx === row.minIdx;
      return {
        ...row,
        done,
        active,
        sub:
          row.key === "asg" && active && st === "accepted"
            ? "In progress…"
            : row.key === "way" && active && st === "dispatched"
              ? "Live tracking below"
              : "",
      };
    });
  }, [req]);

  if (!requestId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.err}>Missing request.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 40 }} />
        <Text style={styles.hint}>Loading your request…</Text>
      </SafeAreaView>
    );
  }

  if (!req || (user && req.userId !== user.uid)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.err}>This request could not be opened.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const openMaps = () => {
    if (pickup) {
      void Linking.openURL(
        `https://maps.google.com/?q=${pickup.latitude},${pickup.longitude}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live tracking</Text>
        </View>

        {req.operatorMessage ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{req.operatorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{stepLabel(req.status)}</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.mapCardTitle}>Live GPS tracking</Text>
            {pickup ? (
              <TouchableOpacity onPress={openMaps}>
                <Text style={styles.mapLink}>View detailed map →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.mapWrap}>
            <MapView style={styles.map} region={mapRegion}>
              {pickup ? (
                <Marker coordinate={pickup} title="Your location" pinColor="#16a34a" />
              ) : null}
              {ambulancePos ? (
                <Marker coordinate={ambulancePos} title="Ambulance" description="Assigned unit" />
              ) : null}
              {pickup && ambulancePos ? (
                <Polyline
                  coordinates={[pickup, ambulancePos]}
                  strokeColor="#9a3412"
                  strokeWidth={2}
                  lineDashPattern={[8, 6]}
                />
              ) : null}
            </MapView>
          </View>
          <View style={styles.distanceBar}>
            <Text style={styles.distanceLabel}>Est. distance</Text>
            <Text style={styles.distanceVal}>
              {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
            </Text>
          </View>
          {!ambulancePos && req.status !== "cancelled" ? (
            <Text style={styles.mapFoot}>
              When dispatch sends an ambulance, its position will appear here and distance will update.
            </Text>
          ) : null}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Status tracking</Text>
          {timeline.map((row, i) => (
            <View key={row.key} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <View
                  style={[
                    styles.tlDot,
                    row.done && styles.tlDotDone,
                    "active" in row && row.active && !row.done && styles.tlDotActive,
                  ]}
                >
                  {row.done ? <Text style={styles.tlCheck}>✓</Text> : null}
                </View>
                {i < timeline.length - 1 ? (
                  <View style={[styles.tlLine, row.done && styles.tlLineDone]} />
                ) : null}
              </View>
              <View style={styles.tlBody}>
                <Text style={[styles.tlLabel, row.done && styles.tlLabelDone]}>{row.label}</Text>
                {row.sub ? <Text style={styles.tlSub}>{row.sub}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.meta}>
          {req.emergencyType} · {req.ambulanceType || "Ambulance"} · {req.locationDetails || "Location on file"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffbeb" },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#7c2d12" },
  banner: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: "#78350f", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginBottom: 14,
  },
  statusPillText: { color: "#c2410c", fontWeight: "800", fontSize: 13 },
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: "#9a3412",
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  mapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mapCardTitle: { fontSize: 13, fontWeight: "800", color: "#422006", textTransform: "uppercase" },
  mapLink: { fontSize: 12, fontWeight: "700", color: "#0369a1" },
  mapWrap: { height: 220, width: "100%" },
  map: { flex: 1 },
  distanceBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  distanceLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  distanceVal: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  mapFoot: { fontSize: 12, color: "#64748b", padding: 12, lineHeight: 17 },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: "#9a3412",
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#422006",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tlRow: { flexDirection: "row", minHeight: 56 },
  tlLeft: { width: 28, alignItems: "center" },
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  tlDotDone: { borderColor: "#16a34a", backgroundColor: "#16a34a" },
  tlDotActive: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  tlCheck: { color: "#fff", fontSize: 11, fontWeight: "900" },
  tlLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: "#e2e8f0",
    marginTop: 2,
  },
  tlLineDone: { backgroundColor: "#86efac" },
  tlBody: { flex: 1, paddingBottom: 8 },
  tlLabel: { fontSize: 15, fontWeight: "700", color: "#94a3b8" },
  tlLabelDone: { color: "#15803d" },
  tlSub: { fontSize: 12, color: "#ea580c", fontWeight: "600", marginTop: 2 },
  meta: { fontSize: 12, color: "#78716c", lineHeight: 18, marginTop: 8 },
  hint: { textAlign: "center", color: "#78716c", marginTop: 12 },
  err: { fontSize: 16, color: "#b91c1c", textAlign: "center", marginTop: 24 },
  link: { color: "#0369a1", textAlign: "center", marginTop: 12, fontWeight: "700" },
});
