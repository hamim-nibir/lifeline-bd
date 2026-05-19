import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import { createAmbulanceRequest } from "../../services/ambulance";
import { useAuthStore } from "../../store/authStore";

const STEP_LABELS = ["Emergency", "Location", "Patient", "Vehicle", "Confirm"] as const;

const EMERGENCY_TYPES = [
  "Accident / Trauma",
  "Heart Attack",
  "Stroke",
  "Pregnancy / Labor",
  "Respiratory Distress",
  "Other Medical Emergency",
];

/** Live patient transport — shown first in step 4 */
const AMBULANCE_LIVE = [
  {
    id: "ac",
    badge: "Premium",
    name: "AC Ambulance",
    points: ["Climate-controlled cabin", "Advanced equipment", "Experienced crew"],
  },
  {
    id: "non-ac",
    badge: "Standard",
    name: "Non-AC Ambulance",
    points: ["Essential equipment", "Short-distance transport", "Cost-effective"],
  },
  {
    id: "icu",
    badge: "Critical care",
    name: "ICU / CCU Ambulance",
    points: ["Mobile intensive care", "Ventilator & monitoring", "Critical transfers"],
  },
];

/**
 * Separated copy — not grouped with emergency ambulances in the UI list title.
 */
const AMBULANCE_MORTUARY = {
  id: "mortuary-transport",
  badge: "Funeral & mortuary",
  name: "Refrigerated mortuary transport",
  subtitle: "For dignified transfer after death — not for live emergencies.",
  points: ["Refrigerated unit", "Trained attendants", "Coordination support"],
};

export default function AmbulanceEmergencyScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();

  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [locationLandmark, setLocationLandmark] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [knownDisease, setKnownDisease] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const call999 = () => {
    void Linking.openURL("tel:999");
  };

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location needed",
          "Allow location to auto-fill pickup, or enter the address manually on the next line."
        );
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = places[0];
      const line = p
        ? [p.name, p.street, p.city, p.region].filter(Boolean).join(", ")
        : "";
      setAddressLine(line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      Alert.alert("Location error", "Could not read GPS. Please type the pickup address below.");
    } finally {
      setLocLoading(false);
    }
  };

  const composedLocationDetails = () => {
    const parts = [addressLine.trim(), locationLandmark.trim()].filter(Boolean);
    return parts.join(" • ");
  };

  const canProceedFromLocation = () => {
    const full = composedLocationDetails();
    return full.length >= 8;
  };

  const validateStep = (s: number): boolean => {
    if (s === 0 && !selectedType) {
      Alert.alert("Select emergency type", "What kind of medical emergency is this?");
      return false;
    }
    if (s === 1 && !canProceedFromLocation()) {
      Alert.alert(
        "Add location",
        "Use GPS or type where the ambulance should come (at least a few characters)."
      );
      return false;
    }
    if (s === 2) {
      if (!patientName.trim()) {
        Alert.alert("Patient name", "Who needs the ambulance?");
        return false;
      }
      if (!age.trim()) {
        Alert.alert("Age", "Approximate age helps dispatch.");
        return false;
      }
    }
    if (s === 3 && !selectedAmbulanceId) {
      Alert.alert("Choose vehicle", "Select the type of ambulance or transport.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((x) => Math.min(x + 1, STEP_LABELS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((x) => x - 1);
  };

  const ambulanceLabel = () => {
    if (selectedAmbulanceId === AMBULANCE_MORTUARY.id) return AMBULANCE_MORTUARY.name;
    const live = AMBULANCE_LIVE.find((a) => a.id === selectedAmbulanceId);
    return live?.name ?? "";
  };

  const submitRequest = async () => {
    if (!user?.uid) {
      Alert.alert("Sign in required", "Log in to submit an ambulance request.");
      return;
    }
    if (!validateStep(3)) return;

    setSubmitting(true);
    try {
      const id = await createAmbulanceRequest({
        userId: user.uid,
        userName: nickname ?? "Citizen",
        category: "single",
        emergencyType: selectedType ?? "",
        patientName: patientName.trim(),
        age: age.trim(),
        bloodGroup,
        knownDisease: knownDisease.trim(),
        emergencyContactName: contactName.trim(),
        emergencyContactNumber: contactNumber.trim(),
        ambulanceType: ambulanceLabel(),
        locationDetails: composedLocationDetails(),
        latitude,
        longitude,
        addressLine: addressLine.trim(),
      });
      router.replace(`/(feat)/ambulance-tracking?requestId=${id}`);
    } catch {
      Alert.alert("Failed", "Could not submit. Check connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backLink} onPress={goBack} activeOpacity={0.75}>
            <View style={styles.backCircle}>
              <Text style={styles.backArrow}>←</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            Ambulance Emergency
          </Text>
        </View>

        <Text style={styles.help}>
          Request an ambulance in a few steps: emergency type, pickup location, patient details, vehicle choice,
          then confirm. After you submit, open the Notifications tab when dispatch updates you — tap an alert to
          open live GPS tracking.
        </Text>
        <TouchableOpacity style={styles.emergency999Btn} onPress={call999} activeOpacity={0.85}>
          <Text style={styles.emergency999BtnText}>Emergency: 999</Text>
        </TouchableOpacity>

        <Text style={styles.progressHint}>
          {step === 0 && "What happened? Pick one — you can move forward in one tap."}
          {step === 1 && "Where should the ambulance come? GPS + landmark saves time."}
          {step === 2 && "Basic patient details for medics."}
          {step === 3 && "Choose transport. Mortuary option is separate — only if appropriate."}
          {step === 4 && "Review and send. Operators see this immediately."}
        </Text>

        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency type</Text>
            <View style={styles.grid}>
              {EMERGENCY_TYPES.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedType(item)}
                  style={[styles.gridItem, selectedType === item && styles.gridItemActive]}
                >
                  <Text style={[styles.gridText, selectedType === item && styles.gridTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pickup location</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => void fetchLocation()} disabled={locLoading}>
              {locLoading ? (
                <ActivityIndicator color="#c2410c" />
              ) : (
                <Text style={styles.secondaryBtnText}>Use my current location (GPS)</Text>
              )}
            </TouchableOpacity>
            {addressLine ? (
              <View style={styles.locBox}>
                <Text style={styles.locLabel}>Detected / entered address</Text>
                <Text style={styles.locValue}>{addressLine}</Text>
              </View>
            ) : null}
            <Text style={styles.fieldLabel}>Type or correct address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street, area, city (required if GPS is off)"
              placeholderTextColor="#94a3b8"
              value={addressLine}
              onChangeText={setAddressLine}
              multiline
            />
            <Text style={styles.fieldLabel}>Landmark (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Gate, floor, building name, nearby shop…"
              placeholderTextColor="#94a3b8"
              value={locationLandmark}
              onChangeText={setLocationLandmark}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Patient name *"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />
            <TextInput
              style={styles.input}
              placeholder="Age *"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
            <Text style={styles.fieldLabel}>Blood group *</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={bloodGroup} onValueChange={(v) => setBloodGroup(String(v))}>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bg) => (
                  <Picker.Item key={bg} label={bg} value={bg} />
                ))}
              </Picker>
            </View>
            <Text style={styles.optionalLabel}>Optional</Text>
            <TextInput
              style={styles.input}
              placeholder="Known conditions / allergies"
              placeholderTextColor="#94a3b8"
              value={knownDisease}
              onChangeText={setKnownDisease}
            />
            <TextInput
              style={styles.input}
              placeholder="Family contact name"
              placeholderTextColor="#94a3b8"
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={styles.input}
              placeholder="Family contact phone"
              placeholderTextColor="#94a3b8"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Live patient transport</Text>
              <Text style={styles.sectionNote}>For emergencies — choose the level you need.</Text>
              {AMBULANCE_LIVE.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedAmbulanceId(item.id)}
                  style={[
                    styles.optionCard,
                    selectedAmbulanceId === item.id && styles.optionCardActive,
                  ]}
                >
                  <Text style={styles.badge}>{item.badge}</Text>
                  <Text style={styles.optionName}>{item.name}</Text>
                  {item.points.map((p) => (
                    <Text key={p} style={styles.bullet}>
                      • {p}
                    </Text>
                  ))}
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.card, styles.mortuaryCard]}>
              <Text style={styles.mortuaryTitle}>Funeral & mortuary (only if needed)</Text>
              <Text style={styles.mortuaryNote}>
                This is not an emergency ambulance. Use only for respectful transfer after a death.
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedAmbulanceId(AMBULANCE_MORTUARY.id)}
                style={[
                  styles.optionCard,
                  selectedAmbulanceId === AMBULANCE_MORTUARY.id && styles.optionCardActive,
                ]}
              >
                <Text style={styles.badgeMuted}>{AMBULANCE_MORTUARY.badge}</Text>
                <Text style={styles.optionName}>{AMBULANCE_MORTUARY.name}</Text>
                <Text style={styles.mortuarySubtitle}>{AMBULANCE_MORTUARY.subtitle}</Text>
                {AMBULANCE_MORTUARY.points.map((p) => (
                  <Text key={p} style={styles.bullet}>
                    • {p}
                  </Text>
                ))}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirm & dispatch</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Emergency</Text>
              <Text style={styles.summaryVal}>{selectedType}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Location</Text>
              <Text style={styles.summaryVal}>{composedLocationDetails() || "—"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Patient</Text>
              <Text style={styles.summaryVal}>
                {patientName}, {age} yrs, {bloodGroup}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Vehicle</Text>
              <Text style={styles.summaryVal}>{ambulanceLabel()}</Text>
            </View>
            {(knownDisease || contactName) ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Extra</Text>
                <Text style={styles.summaryVal}>
                  {[knownDisease, contactName && `${contactName} ${contactNumber}`].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void submitRequest()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit ambulance request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.massCasualtyLink}
          onPress={() => router.push("/(feat)/ambulance-mass-casualty")}
        >
          <Text style={styles.massCasualtyLinkText}>
            Multiple casualties or many ambulances? → Dedicated flow
          </Text>
        </TouchableOpacity>

        {step < STEP_LABELS.length - 1 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backArrow: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 30,
    paddingTop: 2,
  },
  help: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
    marginBottom: 12,
    fontWeight: "500",
  },
  emergency999Btn: {
    alignSelf: "stretch",
    marginBottom: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fdba74",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  emergency999BtnText: {
    color: "#c2410c",
    fontWeight: "900",
    fontSize: 15,
  },
  progressHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: "47%",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#fafafa",
  },
  gridItemActive: {
    borderColor: "#ea580c",
    backgroundColor: "#fff7ed",
  },
  gridText: { color: "#334155", textAlign: "center", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  gridTextActive: { color: "#9a3412" },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: "#fdba74",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fffbeb",
  },
  secondaryBtnText: { color: "#c2410c", fontWeight: "800", fontSize: 15 },
  locBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  locLabel: { fontSize: 11, fontWeight: "700", color: "#166534", textTransform: "uppercase" },
  locValue: { fontSize: 14, color: "#14532d", marginTop: 4, lineHeight: 20, fontWeight: "500" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 6 },
  optionalLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginTop: 4, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fafafa",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#fafafa",
  },
  sectionNote: { fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 18 },
  optionCard: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  optionCardActive: {
    borderColor: "#ea580c",
    backgroundColor: "#fff7ed",
  },
  badge: { color: "#c2410c", fontWeight: "800", fontSize: 11, marginBottom: 4, letterSpacing: 0.3 },
  badgeMuted: { color: "#64748b", fontWeight: "800", fontSize: 11, marginBottom: 4 },
  optionName: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  bullet: { color: "#475569", fontSize: 14, marginBottom: 3, lineHeight: 20 },
  mortuaryCard: {
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  mortuaryTitle: { fontSize: 15, fontWeight: "800", color: "#334155" },
  mortuaryNote: { fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 12, lineHeight: 18 },
  mortuarySubtitle: { fontSize: 13, color: "#64748b", fontStyle: "italic", marginBottom: 6 },
  summaryRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  summaryKey: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" },
  summaryVal: { fontSize: 15, color: "#0f172a", marginTop: 4, lineHeight: 22, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: "#ea580c",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  massCasualtyLink: { paddingVertical: 16, alignItems: "center" },
  massCasualtyLinkText: { color: "#0369a1", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
});
