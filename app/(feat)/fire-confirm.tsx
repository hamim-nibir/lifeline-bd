import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { FireWizardHeader } from "../../components/fire/FireWizardHeader";
import { FireProgressSteps } from "../../components/fire/FireProgressSteps";
import {
  useFireRequestStore,
  formatSeverityLabel,
} from "../../store/fireRequestStore";
import { useAuthStore } from "../../store/authStore";
import { createFireDispatchRequest } from "../../services/fireDispatch";
import { triggerHaptic, showToast } from "../../services/uiHelpers";
import { etaRangeFromDistanceKm } from "../../services/fireStations";

export default function FireConfirmScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const draft = useFireRequestStore();
  const reset = useFireRequestStore((s) => s.reset);
  const [submitting, setSubmitting] = useState(false);

  const { service, severityLevel, contactNumber, peopleAffected, notes, locationText, userLat, userLng, station } =
    draft;

  useEffect(() => {
    if (!service || !station || userLat == null || userLng == null) {
      router.replace("/(feat)/fire-emergency");
    }
  }, [service, station, userLat, userLng, router]);

  const submit = async () => {
    if (!service || !station || userLat == null || userLng == null) return;

    if (!user?.uid) {
      Alert.alert("Sign in required", "Please log in to submit an emergency request.", [
        { text: "Log in", onPress: () => router.replace("/(auth)/login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    setSubmitting(true);
    await triggerHaptic("heavy");

    try {
      const result = await createFireDispatchRequest({
        uid: user.uid,
        reportedBy: nickname ?? "Citizen",
        serviceId: service.id,
        serviceTitle: service.title,
        unit: service.unit,
        serviceDesc: service.desc,
        userLat,
        userLng,
        locationText,
        station,
        severityLevel,
        contactNumber,
        peopleAffected,
        notes,
      });

      reset();
      showToast("Emergency request submitted", "success");

      router.replace({
        pathname: "/(feat)/fire-dispatch-status",
        params: { id: result.id },
      });
    } catch (err) {
      console.error(err);
      showToast("Submission failed", "error");
      Alert.alert(
        "Could not submit",
        "Check your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!service || !station || userLat == null || userLng == null) {
    return null;
  }

  const region = {
    latitude: (userLat + station.latitude) / 2,
    longitude: (userLng + station.longitude) / 2,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.root}>
      <FireWizardHeader
        title="Confirm Emergency Request"
        subtitle="Please review all details carefully before submitting"
        backLabel="← Back to Location"
        onBack={() => router.back()}
      />
      <FireProgressSteps currentStep={3} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠ Please review carefully before submitting</Text>
        </View>

        <ReviewCard
          title="Service Type"
          icon="🔥"
          onEdit={() => router.replace("/(feat)/fire-emergency")}
        >
          <View style={styles.serviceRow}>
            <Text style={styles.serviceIcon}>{service.icon}</Text>
            <Text style={styles.serviceName}>{service.title}</Text>
          </View>
        </ReviewCard>

        <ReviewCard
          title="Incident Details"
          icon="ℹ️"
          onEdit={() => router.replace("/(feat)/fire-details")}
        >
          <View style={styles.detailGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Severity</Text>
              <View style={styles.severityPill}>
                <Text style={styles.severityPillText}>{formatSeverityLabel(severityLevel)}</Text>
              </View>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Contact</Text>
              <Text style={styles.detailValue}>{contactNumber}</Text>
            </View>
          </View>
          {peopleAffected != null && (
            <Text style={styles.extraLine}>People affected: {peopleAffected}</Text>
          )}
          {notes ? <Text style={styles.extraLine}>Notes: {notes}</Text> : null}
        </ReviewCard>

        <ReviewCard
          title="Location & Fire Station"
          icon="📍"
          onEdit={() => router.replace("/(feat)/fire-location")}
        >
          <View style={styles.miniMap}>
            <MapView style={StyleSheet.absoluteFill} initialRegion={region} scrollEnabled={false}>
              <Marker coordinate={{ latitude: userLat, longitude: userLng }} pinColor="#3498DB" />
              <Marker
                coordinate={{ latitude: station.latitude, longitude: station.longitude }}
                pinColor="#E67E22"
              />
            </MapView>
          </View>
          <View style={styles.locBlock}>
            <Text style={styles.locLabel}>Your Location</Text>
            <Text style={styles.locText}>{locationText}</Text>
          </View>
          <View style={[styles.locBlock, styles.locBlockOrange]}>
            <Text style={styles.locLabel}>Nearest Fire Station</Text>
            <Text style={styles.locTextBold}>{station.name}</Text>
            <Text style={styles.locMeta}>
              Distance: {station.distanceKm.toFixed(1)} km • Est. {etaRangeFromDistanceKm(station.distanceKm)}
            </Text>
          </View>
        </ReviewCard>

        <View style={styles.notifyBox}>
          <Text style={styles.notifyText}>
            📢 Emergency services and operators will be notified when you submit.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>🔥 Submit Emergency Request ✓</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ReviewCard({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewTitle}>
          {icon} {title}
        </Text>
        <TouchableOpacity onPress={onEdit}>
          <Text style={styles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, paddingBottom: 40 },
  warningBanner: {
    backgroundColor: "#FEF9C3",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  warningText: { color: "#854D0E", fontWeight: "600", fontSize: 13 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  reviewHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewTitle: { fontSize: 15, fontWeight: "800", color: "#222" },
  editBtn: { color: "#E67E22", fontWeight: "700", fontSize: 13 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceIcon: { fontSize: 28 },
  serviceName: { fontSize: 16, fontWeight: "700" },
  detailGrid: { flexDirection: "row", gap: 12 },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#222" },
  severityPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityPillText: { color: "#C2410C", fontWeight: "800", fontSize: 12 },
  extraLine: { fontSize: 12, color: "#555", marginTop: 8, lineHeight: 18 },
  miniMap: {
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  locBlock: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  locBlockOrange: { backgroundColor: "#FFF7ED" },
  locLabel: { fontSize: 11, fontWeight: "700", color: "#666", marginBottom: 4 },
  locText: { fontSize: 12, color: "#333", lineHeight: 16 },
  locTextBold: { fontSize: 13, fontWeight: "700", color: "#222" },
  locMeta: { fontSize: 11, color: "#E67E22", fontWeight: "600", marginTop: 4 },
  notifyBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  notifyText: { fontSize: 12, color: "#334155", lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#E67E22",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cancelText: { textAlign: "center", color: "#888", fontWeight: "600", paddingVertical: 8 },
});
