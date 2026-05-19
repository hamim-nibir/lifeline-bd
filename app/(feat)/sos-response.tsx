import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  cancelSOS,
  getEmergencyContacts,
  notifyEmergencyContactsCancelled,
} from "../../services/sos";
import { SOSEvent } from "../../types";
import { useAuthStore } from "../../store/authStore";

export default function SOSResponseScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const params = useLocalSearchParams<{ sosId?: string }>();
  const sosId = params.sosId ?? "";
  const [event, setEvent] = useState<SOSEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!sosId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "sos_events", sosId),
      (snap) => {
        if (!snap.exists()) {
          setEvent(null);
          setLoading(false);
          return;
        }
        setEvent({ id: snap.id, ...(snap.data() as Omit<SOSEvent, "id">) });
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [sosId]);

  const phase = useMemo(() => {
    if (!event) return "none";
    if (event.status === "cancelled") return "cancelled";
    if (event.sosPhase === "operator_accepted" || event.operatorAccepted) return "accepted";
    return "waiting";
  }, [event]);

  const etaLabel = useMemo(() => {
    const min = event?.etaMinutesMin ?? 5;
    const max = event?.etaMinutesMax ?? 8;
    return `${min}–${max} minutes`;
  }, [event]);

  const handleCancel = async () => {
    if (!sosId || !user?.uid) {
      router.back();
      return;
    }
    try {
      setIsCancelling(true);
      await cancelSOS(sosId, {
        userName: nickname ?? "User",
        addressHint: event?.address,
      });
      const contacts = await getEmergencyContacts(user.uid);
      await notifyEmergencyContactsCancelled({
        userName: nickname ?? "User",
        contacts,
      });
      Alert.alert("SOS cancelled", "Operators and your dashboard entry were updated.");
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Cancel failed", e?.message ?? "Unable to cancel SOS.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!sosId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Missing SOS reference.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.primaryBtnText}>Go home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.hint}>Connecting to live SOS status…</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>This SOS could not be loaded.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.primaryBtnText}>Go home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === "cancelled") {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>✕</Text>
        <Text style={styles.title}>SOS cancelled</Text>
        <Text style={styles.body}>This SOS session is closed.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const lat = event?.latitude ?? 0;
  const lng = event?.longitude ?? 0;
  const mapOk = Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>{phase === "accepted" ? "🚑" : "📡"}</Text>
      <Text style={styles.title}>
        {phase === "accepted" ? "Help is on the way" : "Alert sent"}
      </Text>
      <Text style={styles.body}>
        {phase === "accepted"
          ? "Stay calm and keep your phone nearby. Responders may try to reach you."
          : "Your SOS is on the operator dashboard. Waiting for an operator to accept…"}
      </Text>

      {mapOk && (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} title="Your location" />
          </MapView>
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Responder status</Text>
        <Text style={styles.statusValue}>
          {phase === "accepted"
            ? event?.responderStatus ?? "Dispatched and en route"
            : event?.responderStatus ?? "Waiting for operator confirmation"}
        </Text>
        {phase === "accepted" && (
          <Text style={styles.statusHint}>Estimated arrival: {etaLabel}</Text>
        )}
      </View>

      {event?.address ? (
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Location on file</Text>
          <Text style={styles.addressValue}>{event.address}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.push("/(feat)/emergency-contacts")}
      >
        <Text style={styles.secondaryBtnText}>Emergency contacts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={isCancelling}
        style={[styles.cancelBtn, isCancelling && { opacity: 0.7 }]}
        onPress={() => {
          Alert.alert(
            "Cancel SOS?",
            "Operators will see that this SOS was cancelled.",
            [
              { text: "Keep active", style: "cancel" },
              { text: "Cancel SOS", style: "destructive", onPress: () => void handleCancel() },
            ]
          );
        }}
      >
        <Text style={styles.cancelText}>{isCancelling ? "Cancelling…" : "Cancel SOS"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff7ed" },
  container: { padding: 22, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff7ed" },
  hint: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  err: { color: "#991b1b", fontSize: 16, textAlign: "center" },
  emoji: { fontSize: 74, textAlign: "center" },
  title: { marginTop: 12, textAlign: "center", fontSize: 28, fontWeight: "800", color: "#991b1b" },
  body: {
    marginTop: 10,
    textAlign: "center",
    color: "#7c2d12",
    lineHeight: 21,
    fontSize: 14,
  },
  mapWrap: {
    marginTop: 18,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fed7aa",
    height: 200,
  },
  map: { width: "100%", height: "100%" },
  statusCard: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 16,
    padding: 16,
  },
  statusLabel: { color: "#9a3412", fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  statusValue: { marginTop: 6, color: "#111827", fontSize: 18, fontWeight: "800" },
  statusHint: { marginTop: 4, color: "#6b7280", fontSize: 13 },
  addressCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  addressLabel: { color: "#92400e", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  addressValue: { marginTop: 4, color: "#78350f", fontSize: 13 },
  primaryBtn: {
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fdba74",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#c2410c", fontWeight: "700", fontSize: 14 },
  cancelBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fee2e2",
  },
  cancelText: { color: "#b91c1c", fontWeight: "800", fontSize: 14 },
});
