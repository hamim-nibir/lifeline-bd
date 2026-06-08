import React, { useEffect, useMemo, useState } from "react";
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
import MapView, { Marker, Polyline } from "react-native-maps";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { formatTime, triggerHaptic } from "../../services/uiHelpers";
import { formatSeverityLabel, type FireSeverity } from "../../store/fireRequestStore";
import { EmergencyChatFAB } from "../../components/chat/EmergencyChatFAB";

type FireDispatch = {
  id: string;
  uid: string;
  serviceTitle: string;
  selectedStationName?: string;
  stationAddress?: string;
  locationText: string;
  mapsLink?: string;
  statusIndex: number;
  distanceKm: number;
  etaText: string;
  assignedUnit?: string | null;
  userLat?: number;
  userLng?: number;
  stationLat?: number;
  stationLng?: number;
  incidentDetails?: {
    severityLevel?: FireSeverity;
    contactNumber?: string;
    peopleAffected?: number | null;
  };
  createdAt?: { toDate?: () => Date };
  updatedAt?: { toDate?: () => Date };
};

const TRACKING_STEPS: Array<{
  key: string;
  label: string;
  icon: string;
  subtext?: string;
}> = [
  { key: "submitted", label: "Request Submitted", icon: "✓" },
  { key: "accepted", label: "Request Accepted", icon: "✓" },
  { key: "dispatched", label: "Fire Unit Dispatched", icon: "🚒" },
  {
    key: "enroute",
    label: "En Route to Your Location",
    icon: "📍",
    subtext: "Emergency unit heading to your location",
  },
  { key: "onscene", label: "On Scene", icon: "🔥" },
  { key: "contained", label: "Incident Contained", icon: "✓" },
];

function regionForCoords(lat1: number, lng1: number, lat2: number, lng2: number) {
  const latSpan = Math.max(Math.abs(lat1 - lat2), 0.012) * 2.2;
  const lngSpan = Math.max(Math.abs(lng1 - lng2), 0.012) * 2.2;
  return {
    latitude: (lat1 + lat2) / 2,
    longitude: (lng1 + lng2) / 2,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };
}

export default function FireDispatchStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatchId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return undefined;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params?.id]);

  const [loading, setLoading] = useState(true);
  const [listenError, setListenError] = useState<string | null>(null);
  const [dispatch, setDispatch] = useState<FireDispatch | null>(null);

  useEffect(() => {
    if (!dispatchId) return;

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "fire-dispatch", dispatchId),
      (snap) => {
        if (!snap.exists()) {
          setDispatch(null);
          setLoading(false);
          return;
        }
        setDispatch({ id: snap.id, ...(snap.data() as Omit<FireDispatch, "id">) });
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setListenError("Could not load live updates.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [dispatchId]);

  const rawStatus = dispatch?.statusIndex ?? 0;
  /** Maps Firestore statusIndex (0–4) to 6-step citizen timeline */
  const activeIndex = rawStatus === 0 ? 0 : Math.min(rawStatus + 1, TRACKING_STEPS.length - 1);

  const mapCoords = useMemo(() => {
    if (!dispatch) return null;
    const { userLat, userLng, stationLat, stationLng } = dispatch;
    if (userLat == null || userLng == null || stationLat == null || stationLng == null) return null;
    return {
      uLat: userLat,
      uLng: userLng,
      sLat: stationLat,
      sLng: stationLng,
      region: regionForCoords(userLat, userLng, stationLat, stationLng),
    };
  }, [dispatch]);

  const callFire = async () => {
    await triggerHaptic("heavy");
    const url = "tel:999";
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Call unavailable", "Cannot place a call from this device.");
  };

  if (!dispatchId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Missing dispatch ID.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unitLabel =
    dispatch?.assignedUnit ??
    `Engine-07 | ${dispatch?.selectedStationName ?? "Fire Station"}`;

  return (
    <View style={styles.root}>
      {dispatch && !loading && !listenError && (
        <EmergencyChatFAB incidentId={dispatch.id} bottom={28} />
      )}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E67E22" />
          <Text style={styles.hint}>Loading live dispatch…</Text>
        </View>
      ) : listenError ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{listenError}</Text>
        </View>
      ) : !dispatch ? (
        <View style={styles.centered}>
          <Text style={styles.error}>Dispatch not found.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.btnText}>Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {mapCoords ? (
            <View style={styles.mapSection}>
              <MapView style={styles.map} initialRegion={mapCoords.region}>
                <Marker
                  coordinate={{ latitude: mapCoords.uLat, longitude: mapCoords.uLng }}
                  title="You"
                  pinColor="#3498DB"
                />
                <Marker
                  coordinate={{ latitude: mapCoords.sLat, longitude: mapCoords.sLng }}
                  title={dispatch.selectedStationName}
                  pinColor="#E67E22"
                />
                <Polyline
                  coordinates={[
                    { latitude: mapCoords.sLat, longitude: mapCoords.sLng },
                    { latitude: mapCoords.uLat, longitude: mapCoords.uLng },
                  ]}
                  strokeColor="#E67E22"
                  strokeWidth={3}
                />
              </MapView>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  📍 Distance {(dispatch.distanceKm ?? 0).toFixed(2)} km
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
            </View>
          )}

          <View style={styles.unitBar}>
            <View style={styles.unitIcon}>
              <Text style={styles.unitIconText}>🚒</Text>
            </View>
            <View style={styles.unitInfo}>
              <Text style={styles.unitSmall}>Fire Unit</Text>
              <Text style={styles.unitName}>{unitLabel}</Text>
              <Text style={styles.unitCrew}>👥 6 Crew Members</Text>
            </View>
            <TouchableOpacity style={styles.callChip} onPress={callFire}>
              <Text style={styles.callChipText}>999</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusHeader}>
            <Text style={styles.statusHeaderText}>Status Updates</Text>
          </View>

          <View style={styles.timeline}>
            {TRACKING_STEPS.map((step, index) => {
              const done = index <= activeIndex;
              const active = index === activeIndex;
              const ts =
                index === 0
                  ? dispatch.createdAt
                  : done
                  ? dispatch.updatedAt
                  : undefined;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineDot,
                      done && styles.timelineDotDone,
                      active && styles.timelineDotActive,
                    ]}
                  >
                    <Text style={styles.timelineDotIcon}>{done ? step.icon : ""}</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]}>
                      {step.label}
                    </Text>
                    {active && step.subtext && (
                      <Text style={styles.timelineSub}>{step.subtext}</Text>
                    )}
                    {done && ts && (
                      <Text style={styles.timelineTime}>🕐 {formatTime(ts)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{dispatch.serviceTitle}</Text>
            <Text style={styles.summaryLine}>
              Severity: {formatSeverityLabel(dispatch.incidentDetails?.severityLevel ?? "high")}
            </Text>
            <Text style={styles.summaryLine}>ETA: ~{dispatch.etaText}</Text>
            {dispatch.mapsLink && (
              <TouchableOpacity
                onPress={() => dispatch.mapsLink && Linking.openURL(dispatch.mapsLink)}
              >
                <Text style={styles.mapLink}>Open directions in Maps →</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  hint: { marginTop: 12, color: "#666" },
  error: { color: "#DC2626", fontWeight: "600", textAlign: "center", marginBottom: 12 },
  btn: {
    backgroundColor: "#E67E22",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  mapSection: { height: 280, position: "relative" },
  map: { ...StyleSheet.absoluteFillObject },
  distanceBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  distanceText: { fontSize: 13, fontWeight: "700", color: "#333" },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderText: { color: "#888" },
  unitBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E67E22",
    padding: 16,
    gap: 12,
  },
  unitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  unitIconText: { fontSize: 24 },
  unitInfo: { flex: 1 },
  unitSmall: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  unitName: { color: "#fff", fontSize: 16, fontWeight: "800", marginVertical: 2 },
  unitCrew: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  callChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callChipText: { color: "#E67E22", fontWeight: "800", fontSize: 14 },
  statusHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    alignItems: "flex-end",
  },
  statusHeaderText: { color: "#E67E22", fontWeight: "800", fontSize: 14 },
  timeline: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timelineDotDone: { backgroundColor: "#27AE60" },
  timelineDotActive: { backgroundColor: "#E67E22" },
  timelineDotIcon: { fontSize: 16, color: "#fff" },
  timelineContent: { flex: 1, paddingTop: 4 },
  timelineLabel: { fontSize: 14, fontWeight: "600", color: "#AAA" },
  timelineLabelDone: { color: "#222", fontWeight: "800" },
  timelineSub: { fontSize: 12, color: "#E67E22", marginTop: 4 },
  timelineTime: { fontSize: 11, color: "#999", marginTop: 4 },
  summaryCard: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  summaryTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  summaryLine: { fontSize: 13, color: "#555", marginBottom: 4 },
  mapLink: { color: "#3498DB", fontWeight: "700", marginTop: 8, fontSize: 13 },
  homeBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  homeBtnText: { fontWeight: "700", color: "#555" },
});
