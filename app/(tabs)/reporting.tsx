import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { useLanguage } from "../../contexts/LanguageContext";

type ReportType = {
  id: string;
  icon: string;
  color: string;
  labelKey: string;
};

const REPORT_TYPES: ReportType[] = [
  { id: "crime", icon: "🛡️", color: "#eff6ff", labelKey: "reporting.crimeReport" },
  { id: "accident", icon: "⚠️", color: "#fffbeb", labelKey: "reporting.accidentReport" },
  { id: "fire", icon: "🔥", color: "#fdf2f8", labelKey: "reporting.fireReport" },
  { id: "harassment", icon: "🟣", color: "#f5f3ff", labelKey: "reporting.harassmentReport" },
  { id: "medical", icon: "🩺", color: "#ecfeff", labelKey: "reporting.medicalEmergency" },
  { id: "missing", icon: "👥", color: "#fdf2f8", labelKey: "reporting.missingPerson" },
];

export default function ReportingScreen() {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const attachLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.alerts"), t("disaster.locationNeeded"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocationText(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
    } catch {
      Alert.alert(t("common.alerts"), t("disaster.locationFailed"));
    } finally {
      setLocating(false);
    }
  };

  const submitReport = async () => {
    if (!selectedType || !details.trim()) {
      Alert.alert(t("common.alerts"), t("reporting.fillDetails"));
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDetails("");
      setLocationText("");
      Alert.alert(t("common.alerts"), t("reporting.submitSuccess"));
    }, 800);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: "#111827", fontSize: 30, fontWeight: "800" }}>{t("reporting.title")}</Text>
      <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{t("reporting.subtitle")}</Text>

      <Text style={{ color: "#111827", fontWeight: "700", marginTop: 18, marginBottom: 10, fontSize: 18 }}>
        {t("reporting.selectType")}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {REPORT_TYPES.map((item) => {
          const active = selectedType === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedType(item.id)}
              style={{
                width: "31%",
                minWidth: 106,
                backgroundColor: item.color,
                borderRadius: 12,
                borderWidth: active ? 2 : 1,
                borderColor: active ? "#f97316" : "#e5e7eb",
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</Text>
              <Text style={{ color: "#111827", fontSize: 11, fontWeight: "600", textAlign: "center" }}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!selectedType ? (
        <View
          style={{
            marginTop: 20,
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderStyle: "dashed",
            borderRadius: 16,
            height: 170,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 40, color: "#9ca3af" }}>📄</Text>
          <Text style={{ color: "#6b7280", marginTop: 8 }}>{t("reporting.beginPrompt")}</Text>
        </View>
      ) : (
        <View style={{ marginTop: 20, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14 }}>
          <Text style={{ color: "#111827", fontWeight: "700", marginBottom: 8 }}>{t("reporting.details")}</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder={t("reporting.detailsPlaceholder")}
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              textAlignVertical: "top",
              color: "#1f2937",
            }}
          />

          <TouchableOpacity
            onPress={attachLocation}
            disabled={locating}
            style={{
              marginTop: 10,
              backgroundColor: "#eef2ff",
              borderColor: "#c7d2fe",
              borderWidth: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            {locating ? (
              <ActivityIndicator color="#4f46e5" />
            ) : (
              <Text style={{ color: "#3730a3", fontWeight: "700", fontSize: 12 }}>{t("reporting.shareLocation")}</Text>
            )}
          </TouchableOpacity>

          {!!locationText && (
            <Text style={{ color: "#16a34a", marginTop: 8, fontSize: 12 }}>
              {t("reporting.locationAttached")}: {locationText}
            </Text>
          )}

          <TouchableOpacity
            onPress={submitReport}
            disabled={submitting}
            style={{
              marginTop: 12,
              backgroundColor: "#f97316",
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>{t("reporting.submitReport")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
