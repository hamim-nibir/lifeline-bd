import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import { createAmbulanceRequest } from "../../services/ambulance";
import { useAuthStore } from "../../store/authStore";

const INCIDENT_TYPES = ["Road Accident", "Fire Incident", "Building Collapse", "Flood Rescue", "Other"];

export default function AmbulanceMassCasualtyScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();

  const [ambulanceCount, setAmbulanceCount] = useState("2");
  const [incidentType, setIncidentType] = useState("Road Accident");
  const [estimatedCasualties, setEstimatedCasualties] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [locationLandmark, setLocationLandmark] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location", "Allow location or enter the incident site address manually.");
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
      const line = p ? [p.name, p.street, p.city, p.region].filter(Boolean).join(", ") : "";
      setAddressLine(line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      Alert.alert("GPS error", "Enter the location manually.");
    } finally {
      setLocLoading(false);
    }
  };

  const composedLocation = () => {
    const parts = [addressLine.trim(), locationLandmark.trim()].filter(Boolean);
    return parts.join(" • ");
  };

  const submit = async () => {
    if (!user?.uid) {
      Alert.alert("Sign in required", "Log in to request multiple ambulances.");
      return;
    }
    const loc = composedLocation();
    if (loc.length < 8) {
      Alert.alert("Location required", "Add where the incident is — GPS or typed address.");
      return;
    }
    const count = Math.max(1, parseInt(ambulanceCount, 10) || 1);
    setSubmitting(true);
    try {
      const id = await createAmbulanceRequest({
        userId: user.uid,
        userName: nickname ?? "Citizen",
        category: "mass_casualty",
        emergencyType: `Mass casualty — ${incidentType}`,
        ambulanceCount: count,
        incidentType,
        estimatedCasualties: estimatedCasualties.trim(),
        locationDetails: loc,
        latitude,
        longitude,
        addressLine: addressLine.trim(),
      });
      router.replace(`/(feat)/ambulance-tracking?requestId=${id}`);
    } catch {
      Alert.alert("Failed", "Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backWrap}>
          <Text style={styles.back}>← Ambulance emergency</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Mass casualty</Text>
          <Text style={styles.heroBody}>
            Use this only when many people are hurt or you need several ambulances. Location is required first.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Incident site — GPS</Text>
          <TouchableOpacity style={styles.gpsBtn} onPress={() => void fetchLocation()} disabled={locLoading}>
            {locLoading ? (
              <ActivityIndicator color="#c2410c" />
            ) : (
              <Text style={styles.gpsBtnText}>Use current location</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.label}>Address / area *</Text>
          <TextInput
            style={styles.input}
            placeholder="Full location of the incident"
            placeholderTextColor="#94a3b8"
            value={addressLine}
            onChangeText={setAddressLine}
            multiline
          />
          <Text style={styles.label}>Landmark (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Highway km, building, gate…"
            placeholderTextColor="#94a3b8"
            value={locationLandmark}
            onChangeText={setLocationLandmark}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Ambulances needed</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={ambulanceCount}
            onChangeText={setAmbulanceCount}
          />
          <Text style={styles.label}>Incident type</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={incidentType} onValueChange={(v) => setIncidentType(String(v))}>
              {INCIDENT_TYPES.map((t) => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>
          <Text style={styles.label}>Estimated casualties (approx.)</Text>
          <TextInput
            style={styles.input}
            placeholder="Number or range"
            placeholderTextColor="#94a3b8"
            keyboardType="default"
            value={estimatedCasualties}
            onChangeText={setEstimatedCasualties}
          />
        </View>

        <TouchableOpacity style={styles.submit} onPress={() => void submit()} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Request multiple ambulances</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16, paddingBottom: 36 },
  backWrap: { marginBottom: 12 },
  back: { fontSize: 15, fontWeight: "600", color: "#475569" },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroBody: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginTop: 10, fontWeight: "500" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 8, textTransform: "uppercase" },
  gpsBtn: {
    borderWidth: 2,
    borderColor: "#fdba74",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#fffbeb",
  },
  gpsBtnText: { color: "#c2410c", fontWeight: "800", fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fafafa",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    backgroundColor: "#fafafa",
  },
  submit: {
    backgroundColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
