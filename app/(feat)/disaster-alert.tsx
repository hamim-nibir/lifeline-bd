import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  fetchLiveDisasterAlerts,
  fetchNearbyShelters,
  pushDisasterWarningNotifications,
  getDefaultUserCoordinates,
  type LiveDisasterAlert,
  type ShelterLocation,
} from "../../services/disasterIntelService";
import {
  PREPAREDNESS_GUIDES,
  type PreparednessDisasterType,
} from "../../constants/disasterPreparedness";
import { formatDistance } from "../../utils/geo";

type DisasterType =
  | "Flood"
  | "Cyclone"
  | "Earthquake"
  | "Landslide"
  | "Fire (Wildfire)"
  | "Other"
  | null;

type Urgency = "Critical" | "High" | "Moderate";

const DISASTER_TYPES: Exclude<DisasterType, null>[] = [
  "Flood", "Cyclone", "Earthquake", "Landslide", "Fire (Wildfire)", "Other",
];

const RELEVANCE_LABEL: Record<string, string> = {
  bangladesh: "🇧🇩 Affects Bangladesh",
  near_you: "📍 Near your location",
  regional: "🌏 Regional risk",
};

const SEVERITY_COLOR: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  green: "#16a34a",
  moderate: "#ca8a04",
  high: "#ea580c",
};

export default function DisasterAlertScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  const [coords, setCoords] = useState(getDefaultUserCoordinates());
  const [liveAlerts, setLiveAlerts] = useState<LiveDisasterAlert[]>([]);
  const [shelters, setShelters] = useState<ShelterLocation[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<LiveDisasterAlert | null>(null);
  const [activeGuide, setActiveGuide] = useState<PreparednessDisasterType>("Flood");
  const [loadingIntel, setLoadingIntel] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const [disasterType, setDisasterType] = useState<DisasterType>(null);
  const [urgency, setUrgency] = useState<Urgency>("High");
  const [peopleAffected, setPeopleAffected] = useState("");
  const [description, setDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadIntel = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingIntel(true);

    try {
      let lat = coords.latitude;
      let lon = coords.longitude;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        setCoords({ latitude: lat, longitude: lon });
      }

      const [alerts, nearbyShelters] = await Promise.all([
        fetchLiveDisasterAlerts(lat, lon),
        fetchNearbyShelters(lat, lon),
      ]);

      setLiveAlerts(alerts);
      setShelters(nearbyShelters);

      if (uid && alerts.length > 0) {
        const pushed = await pushDisasterWarningNotifications(uid, alerts);
        if (pushed > 0 && !isRefresh) {
          Alert.alert(
            "⚠️ Disaster warning",
            `${pushed} new alert(s) near Bangladesh or your location. Check Notifications and shelters below.`
          );
        }
      }

      if (alerts.length > 0 && !selectedAlert) {
        const first = alerts[0];
        setSelectedAlert(first);
        setActiveGuide(first.preparednessType);
      }
    } catch (e) {
      console.error("Disaster intel load failed:", e);
    } finally {
      setLoadingIntel(false);
      setRefreshing(false);
    }
  }, [coords.latitude, coords.longitude, uid, selectedAlert]);

  useEffect(() => {
    loadIntel();
  }, []);

  const selectAlert = (alert: LiveDisasterAlert) => {
    setSelectedAlert(alert);
    setActiveGuide(alert.preparednessType);
    setDisasterType(
      alert.preparednessType === "Drought" ? "Other" : (alert.preparednessType as DisasterType)
    );
  };

  const guide = PREPAREDNESS_GUIDES[activeGuide];

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
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      Alert.alert("Error", "Could not get your location. Try again.");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!disasterType) {
      Alert.alert("Required", "Please select a disaster type.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please describe the situation.");
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert("Required", "Please enter a contact number.");
      return;
    }
    if (!location) {
      Alert.alert("Required", "Please share your location before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const alertData = {
        uid: user?.uid ?? "anonymous",
        reportedBy: nickname ?? "Unknown",
        disasterType,
        urgency,
        peopleAffected: peopleAffected.trim() || null,
        description: description.trim(),
        contactNumber: contactNumber.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          mapsLink,
        },
        status: "pending",
        createdAt: serverTimestamp(),
      };

      const alertRef = await addDoc(collection(db, "disasterAlerts"), alertData);
      await addDoc(collection(db, "notifications"), {
        type: "disasterAlert",
        reportId: alertRef.id,
        title: "🌩️ Disaster Alert",
        body: `${nickname ?? "Someone"} reported ${disasterType} (${urgency}) at ${location.address}`,
        reportedBy: nickname ?? "Unknown",
        reportedByUid: user?.uid ?? "",
        disasterType,
        urgency,
        location: alertData.location,
        read: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "✅ Alert Sent",
        "Your disaster alert has been sent to emergency operators.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert("Error", "Failed to send alert. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{
        backgroundColor: "#7c3aed",
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
            width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Disaster Alert</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            Live warnings · shelters · emergency report
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => loadIntel(true)}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadIntel(true)} tintColor="#7c3aed" />
        }
      >
        {/* ── LIVE ALERTS FROM INTERNET ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>🌐 Live disaster warnings</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
            Data from GDACS, USGS, NASA EONET & weather services. Alerts near Bangladesh or your
            location are sent to your Notifications tab.
          </Text>

          {loadingIntel ? (
            <ActivityIndicator color="#7c3aed" style={{ marginVertical: 20 }} />
          ) : liveAlerts.length === 0 ? (
            <View style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 16 }}>
              <Text style={{ color: "#15803d", fontWeight: "700" }}>✅ No major threats detected</Text>
              <Text style={{ color: "#166534", fontSize: 12, marginTop: 4 }}>
                No active disasters near you or Bangladesh right now. Pull to refresh.
              </Text>
            </View>
          ) : (
            liveAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                onPress={() => selectAlert(alert)}
                style={{
                  borderWidth: 1.5,
                  borderColor: selectedAlert?.id === alert.id ? "#7c3aed" : "#e5e7eb",
                  backgroundColor: selectedAlert?.id === alert.id ? "#f5f3ff" : "#fff",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontWeight: "800", color: "#111", flex: 1, fontSize: 14 }}>
                    {alert.title}
                  </Text>
                  <View style={{
                    backgroundColor: SEVERITY_COLOR[alert.severity] ?? "#9ca3af",
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {alert.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: "#4b5563", fontSize: 12, lineHeight: 18 }} numberOfLines={3}>
                  {alert.description}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: "#7c3aed", fontWeight: "700" }}>
                    {RELEVANCE_LABEL[alert.relevance] ?? alert.relevance}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>
                    📍 {formatDistance(alert.distanceKm)} away · {alert.source.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── WHAT TO BRING ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>{guide.icon} What to bring — {guide.type}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>{guide.summary}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {(Object.keys(PREPAREDNESS_GUIDES) as PreparednessDisasterType[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setActiveGuide(t);
                  setDisasterType(t === "Drought" ? "Other" : (t as DisasterType));
                }}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: activeGuide === t ? "#7c3aed" : "#f3f4f6",
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: activeGuide === t ? "#fff" : "#374151",
                }}>
                  {PREPAREDNESS_GUIDES[t].icon} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {guide.essentials.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <Text style={{ color: "#7c3aed" }}>✓</Text>
              <Text style={{ color: "#374151", fontSize: 13, flex: 1 }}>{item}</Text>
            </View>
          ))}
          <Text style={{ ...sectionTitleStyle, marginTop: 12, marginBottom: 6 }}>Safety tips</Text>
          {guide.safetyTips.map((tip, i) => (
            <Text key={i} style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>• {tip}</Text>
          ))}
        </View>

        {/* ── NEARBY SHELTERS ── */}
        <View style={cardStyle}>
          <Text style={sectionTitleStyle}>🏠 Nearest safe shelters</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
            Cyclone & flood shelters near you (OpenStreetMap + Bangladesh fallback list)
          </Text>
          {shelters.length === 0 ? (
            <ActivityIndicator color="#7c3aed" />
          ) : (
            shelters.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => Linking.openURL(s.mapsLink)}
                style={{
                  borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
                  padding: 14, marginBottom: 8, backgroundColor: "#fafafa",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#111", fontSize: 14 }}>{s.name}</Text>
                {s.address && (
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{s.address}</Text>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: "#7c3aed", fontSize: 12, fontWeight: "700" }}>
                    📍 {formatDistance(s.distanceKm)} away
                  </Text>
                  <Text style={{ color: "#16a34a", fontSize: 12, fontWeight: "700" }}>
                    Open in Maps →
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── REPORT EMERGENCY (toggle) ── */}
        <TouchableOpacity
          onPress={() => setShowReportForm(!showReportForm)}
          style={{
            backgroundColor: "#7c3aed",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
            🆘 Report emergency to operators
          </Text>
          <Text style={{ color: "#fff", fontSize: 18 }}>{showReportForm ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {showReportForm && (
          <>
            <View style={[cardStyle, !disasterType && { borderColor: "#c4b5fd" }]}>
              <Text style={sectionTitleStyle}>
                Disaster Type <Text style={{ color: "#dc2626" }}>*</Text>
              </Text>
              {DISASTER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setDisasterType(type);
                    setActiveGuide(type as PreparednessDisasterType);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: disasterType === type ? "#7c3aed" : "#d1d5db",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {disasterType === type && (
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#7c3aed" }} />
                    )}
                  </View>
                  <Text style={{
                    fontSize: 14,
                    color: disasterType === type ? "#7c3aed" : "#374151",
                    fontWeight: disasterType === type ? "700" : "400",
                  }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={cardStyle}>
              <Text style={sectionTitleStyle}>Urgency Level</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {(["Critical", "High", "Moderate"] as Urgency[]).map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setUrgency(level)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: urgency === level ? "#7c3aed" : "#f3f4f6",
                      borderWidth: 1, borderColor: urgency === level ? "#7c3aed" : "#e5e7eb",
                    }}
                  >
                    <Text style={{
                      color: urgency === level ? "#fff" : "#374151",
                      fontWeight: "700", fontSize: 13,
                    }}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={cardStyle}>
              <Text style={sectionTitleStyle}>Situation Details</Text>
              <Text style={labelStyle}>People affected (optional)</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 5 families trapped"
                placeholderTextColor="#9ca3af"
                value={peopleAffected}
                onChangeText={setPeopleAffected}
              />
              <Text style={labelStyle}>
                Description <Text style={{ color: "#dc2626" }}>*</Text>
              </Text>
              <TextInput
                style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]}
                placeholder="Describe the disaster..."
                placeholderTextColor="#9ca3af"
                multiline
                value={description}
                onChangeText={setDescription}
              />
              <Text style={labelStyle}>
                Contact Number <Text style={{ color: "#dc2626" }}>*</Text>
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 01XXXXXXXXX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={setContactNumber}
              />
            </View>

            <View style={cardStyle}>
              <Text style={sectionTitleStyle}>
                Location <Text style={{ color: "#dc2626" }}>*</Text>
              </Text>
              {location ? (
                <View style={{
                  backgroundColor: "#f5f3ff", borderWidth: 1, borderColor: "#c4b5fd",
                  borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 10,
                }}>
                  <Text style={{ color: "#5b21b6", fontWeight: "700", fontSize: 13 }}>✅ Location captured</Text>
                  <Text style={{ color: "#4c1d95", fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                    {location.address}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: "#9ca3af", fontSize: 13, marginVertical: 10 }}>
                  Share your live location for rescue teams
                </Text>
              )}
              <TouchableOpacity
                onPress={handleShareLocation}
                disabled={locLoading}
                style={{
                  backgroundColor: location ? "#f5f3ff" : "#7c3aed",
                  borderWidth: location ? 1 : 0, borderColor: "#c4b5fd",
                  borderRadius: 12, paddingVertical: 14, alignItems: "center",
                }}
              >
                {locLoading ? (
                  <ActivityIndicator color={location ? "#5b21b6" : "#fff"} />
                ) : (
                  <Text style={{ color: location ? "#5b21b6" : "#fff", fontWeight: "700" }}>
                    📍 {location ? "Update Location" : "Share My Location"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 16,
                alignItems: "center", marginBottom: 8,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Send Alert to Operators</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
