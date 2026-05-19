import { useState, useMemo, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import {
  getReportConfig,
  type ReportFieldDef,
  type ReportCategory,
} from "../../constants/citizenReportConfig";
import { submitCitizenReport } from "../../services/citizenReportService";
import EvidenceUploader from "../../components/reports/EvidenceUploader";
import type { LocalEvidenceFile } from "../../services/reportEvidenceUpload";

export default function CitizenReportFormScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const config = useMemo(() => getReportConfig(category ?? ""), [category]);
  const { user, nickname, accountType } = useAuthStore();

  useEffect(() => {
    if (accountType === "operator") {
      router.replace("/(tabs)/report");
    }
  }, [accountType]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [contactNumber, setContactNumber] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<LocalEvidenceFile[]>([]);

  if (accountType === "operator") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#c4451a" />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>Invalid report type</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#c4451a", fontWeight: "700" }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const setField = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleShareLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const place = geocode[0];
      const address = [place?.name, place?.street, place?.district, place?.city]
        .filter(Boolean)
        .join(", ");
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address || "Location captured",
      });
    } catch {
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLocLoading(false);
    }
  };

  const validate = (): boolean => {
    for (const field of config.fields) {
      if (field.required && !values[field.key]?.trim()) {
        Alert.alert("Required field", `Please fill in: ${field.label.replace(" *", "")}`);
        return false;
      }
    }
    if (!contactNumber.trim()) {
      Alert.alert("Required", "Please enter your contact number.");
      return false;
    }
    if (!location) {
      Alert.alert("Required", "Please share your current location.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const mapsLink = `https://maps.google.com/?q=${location!.latitude},${location!.longitude}`;
      await submitCitizenReport({
        category: config.category as ReportCategory,
        uid: user?.uid ?? "anonymous",
        reportedBy: nickname ?? "Unknown",
        contactNumber: contactNumber.trim(),
        details: values,
        location: {
          ...location!,
          mapsLink,
        },
        evidenceFiles,
      });
      Alert.alert(
        "✅ Report submitted",
        "Your report has been sent to operators for review. They may forward it to police, hospital, ambulance, fire service, or volunteers.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: ReportFieldDef) => {
    const val = values[field.key] ?? "";

    if (field.type === "radio" || field.type === "select") {
      const opts = field.options ?? [];
      return (
        <View key={field.key} style={{ marginBottom: 14 }}>
          <Text style={labelStyle}>
            {field.label}
            {field.required && <Text style={{ color: "#dc2626" }}> *</Text>}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {opts.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setField(field.key, opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: val === opt ? config.accent : "#e5e7eb",
                  backgroundColor: val === opt ? config.accent : "#fff",
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: val === opt ? "#fff" : "#374151",
                }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>
          {field.label}
          {field.required && <Text style={{ color: "#dc2626" }}> *</Text>}
        </Text>
        <TextInput
          style={[
            inputStyle,
            (field.type === "textarea" || field.multiline) && { minHeight: 88, textAlignVertical: "top" },
          ]}
          placeholder={field.placeholder ?? ""}
          placeholderTextColor="#9ca3af"
          value={val}
          onChangeText={(t) => setField(field.key, t)}
          multiline={field.type === "textarea" || field.multiline}
          keyboardType={
            field.type === "phone" ? "phone-pad" : field.type === "number" ? "numeric" : "default"
          }
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{
        backgroundColor: config.accent,
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
            backgroundColor: "rgba(255,255,255,0.25)",
            width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>
            {config.icon} {config.title}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}>
            {config.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={cardStyle}>
          <Text style={sectionTitle}>Your contact</Text>
          <Text style={labelStyle}>
            Phone number <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <TextInput
            style={inputStyle}
            placeholder="01XXXXXXXXX"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={contactNumber}
            onChangeText={setContactNumber}
          />
        </View>

        <View style={cardStyle}>
          <Text style={sectionTitle}>Report details</Text>
          {config.fields.map(renderField)}
        </View>

        <View style={cardStyle}>
          <Text style={sectionTitle}>Evidence (optional)</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
            Attach photos, videos, or documents related to this report
          </Text>
          <EvidenceUploader
            files={evidenceFiles}
            onChange={setEvidenceFiles}
            accent={config.accent}
          />
        </View>

        <View style={cardStyle}>
          <Text style={sectionTitle}>
            Your location <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>
            Share where you are now (or nearest point to the incident)
          </Text>
          {location && (
            <View style={{
              backgroundColor: "#f0fdf4",
              borderWidth: 1,
              borderColor: "#86efac",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}>
              <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 12 }}>✅ {location.address}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleShareLocation}
            disabled={locLoading}
            style={{
              backgroundColor: location ? "#f0fdf4" : config.accent,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: location ? 1 : 0,
              borderColor: "#86efac",
            }}
          >
            {locLoading ? (
              <ActivityIndicator color={config.accent} />
            ) : (
              <Text style={{ color: location ? "#15803d" : "#fff", fontWeight: "700" }}>
                📍 {location ? "Update location" : "Share my location"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: config.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 4,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Submit report to operators</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#f3f4f6",
};
const sectionTitle = { fontSize: 15, fontWeight: "700" as const, color: "#111", marginBottom: 12 };
const labelStyle = { fontSize: 13, fontWeight: "600" as const, color: "#374151", marginBottom: 6 };
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
