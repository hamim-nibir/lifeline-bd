import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ── Types ──
type AccidentType = "Road Accident" | "Workplace Accident" | "Home Accident";
type YesNo = "Yes" | "No";

export default function AccidentReportScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();

  // ── Form state ──
  const [accidentType, setAccidentType] = useState<AccidentType>("Road Accident");
  const [vehicleType, setVehicleType] = useState("");
  const [numVehicles, setNumVehicles] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [numInjured, setNumInjured] = useState("");
  const [severeInjury, setSevereInjury] = useState<YesNo>("No");
  const [bleeding, setBleeding] = useState<YesNo>("No");
  const [roadBlocked, setRoadBlocked] = useState<YesNo>("No");
  const [fireRisk, setFireRisk] = useState<YesNo>("No");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // ── UI state ──
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Share location ──
  const handleShareLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // reverse geocode for human readable address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const place = geocode[0];
      const address = [
        place?.name,
        place?.street,
        place?.district,
        place?.city,
      ]
        .filter(Boolean)
        .join(", ");

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address || "Location captured",
      });
    } catch (err) {
      Alert.alert("Error", "Could not get your location. Try again.");
    } finally {
      setLocLoading(false);
    }
  };

  // ── Submit report ──
  const handleSubmit = async () => {
    if (!numInjured) {
      Alert.alert("Required", "Please enter number of injured persons.");
      return;
    }
    if (!location) {
      Alert.alert("Required", "Please share your location before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "accidentReports"), {
        uid: user?.uid ?? "anonymous",
        reportedBy: nickname ?? "Unknown",
        accidentType,
        vehicleInfo:
          accidentType === "Road Accident"
            ? { vehicleType, numVehicles, plateNumber }
            : null,
        injuryDetails: {
          numInjured,
          severeInjury,
          bleeding,
        },
        sceneSafety: {
          roadBlocked,
          fireRisk,
        },
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          mapsLink: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
        },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "✅ Report Submitted",
        "Your accident report has been sent to operators.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reusable radio group ──
  const RadioGroup = ({
    label,
    options,
    value,
    onChange,
    required = false,
  }: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: any) => void;
    required?: boolean;
  }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={labelStyle}>
        {label}
        {required && (
          <Text style={{ color: "#dc2626" }}> *</Text>
        )}
      </Text>
      <View style={{ flexDirection: "row", gap: 20, marginTop: 6 }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <View style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: value === opt ? "#f97316" : "#d1d5db",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {value === opt && (
                <View style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: "#f97316",
                }} />
              )}
            </View>
            <Text style={{ color: "#374151", fontSize: 14 }}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#f97316",
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Accident Report
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            Report an accident to operators
          </Text>
        </View>
      </View>

      {/* ── Scrollable Form ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Accident Type card ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>Accident Type</Text>
          {(["Road Accident", "Workplace Accident", "Home Accident"] as AccidentType[]).map(
            (type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setAccidentType(type)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                }}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: accidentType === type ? "#f97316" : "#d1d5db",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {accidentType === type && (
                    <View style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: "#f97316",
                    }} />
                  )}
                </View>
                <Text style={{
                  fontSize: 14,
                  color: accidentType === type ? "#f97316" : "#374151",
                  fontWeight: accidentType === type ? "700" : "400",
                }}>
                  {type}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* ── Vehicle Info (only for Road Accident) ── */}
        {accidentType === "Road Accident" && (
          <View style={cardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 18 }}>🚗</Text>
              <Text style={sectionTitleStyle}>Vehicle Info (If Applicable)</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Vehicle Type</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Car, Bus, Truck"
                  placeholderTextColor="#9ca3af"
                  value={vehicleType}
                  onChangeText={setVehicleType}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Number of Vehicles</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 2"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={numVehicles}
                  onChangeText={setNumVehicles}
                />
              </View>
            </View>

            <Text style={labelStyle}>Plate Number (Optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. DHA-1234"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              value={plateNumber}
              onChangeText={setPlateNumber}
            />
          </View>
        )}

        {/* ── Injury Details ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>Injury Details</Text>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>
                Number of Injured Persons
                <Text style={{ color: "#dc2626" }}> *</Text>
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 3"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={numInjured}
                onChangeText={setNumInjured}
              />
            </View>
            <View style={{ flex: 1 }}>
              <RadioGroup
                label="Severe injury?"
                options={["Yes", "No"]}
                value={severeInjury}
                onChange={setSevereInjury}
                required
              />
            </View>
          </View>

          <RadioGroup
            label="Bleeding / unconscious victims?"
            options={["Yes", "No"]}
            value={bleeding}
            onChange={setBleeding}
            required
          />
        </View>

        {/* ── Scene Safety ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>Scene Safety</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <RadioGroup
                label="Road blocked?"
                options={["Yes", "No"]}
                value={roadBlocked}
                onChange={setRoadBlocked}
              />
            </View>
            <View style={{ flex: 1 }}>
              <RadioGroup
                label="Fire risk?"
                options={["Yes", "No"]}
                value={fireRisk}
                onChange={setFireRisk}
              />
            </View>
          </View>
        </View>

        {/* ── Location ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>
            Location
            <Text style={{ color: "#dc2626" }}> *</Text>
          </Text>

          {location ? (
            <View style={{
              backgroundColor: "#f0fdf4",
              borderWidth: 1,
              borderColor: "#86efac",
              borderRadius: 12,
              padding: 14,
              marginTop: 8,
              marginBottom: 10,
            }}>
              <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
                ✅ Location captured
              </Text>
              <Text style={{ color: "#166534", fontSize: 12, lineHeight: 18 }}>
                {location.address}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, marginBottom: 10 }}>
              Your live location will be shared with operators
            </Text>
          )}

          <TouchableOpacity
            onPress={handleShareLocation}
            disabled={locLoading}
            style={{
              backgroundColor: location ? "#f0fdf4" : "#f97316",
              borderWidth: location ? 1 : 0,
              borderColor: "#86efac",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {locLoading ? (
              <ActivityIndicator color={location ? "#15803d" : "#fff"} />
            ) : (
              <>
                <Text style={{ fontSize: 18 }}>📍</Text>
                <Text style={{
                  color: location ? "#15803d" : "#fff",
                  fontWeight: "700",
                  fontSize: 14,
                }}>
                  {location ? "Update Location" : "Share My Location"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Action buttons ── */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flex: 1,
              backgroundColor: "#f3f4f6",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2,
              backgroundColor: "#f97316",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              elevation: 3,
              shadowColor: "#f97316",
              shadowOpacity: 0.3,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>📋</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Submit Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Shared styles ──
const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#f3f4f6",
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

const sectionTitleStyle = {
  fontSize: 15,
  fontWeight: "700" as const,
  color: "#1f2937",
  marginBottom: 4,
};

const labelStyle = {
  color: "#374151",
  fontSize: 13,
  fontWeight: "600" as const,
  marginBottom: 6,
  marginTop: 4,
};

const inputStyle = {
  backgroundColor: "#f9fafb",
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 11,
  fontSize: 14,
  color: "#1f2937",
};