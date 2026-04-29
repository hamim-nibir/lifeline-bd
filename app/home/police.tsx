import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../../store/authStore";
import { submitPoliceReport, sendSOSAlert } from "../../services/policeService";

const INCIDENTS = [
  { value: "theft",      label: "Theft / Robbery",           icon: "ℹ️" },
  { value: "harassment", label: "Harassment /\nWomen Safety", icon: "⚠️" },
  { value: "violence",   label: "Violence / Threat",          icon: "⚠️" },
  { value: "missing",    label: "Missing Person",             icon: "ℹ️" },
  { value: "accident",   label: "Accident / Crowd Control",   icon: "ℹ️" },
  { value: "suspicious", label: "Suspicious Activity",        icon: "ℹ️" },
];

const STATIONS = [
  { name: "Dhaka Metro Police Station", dist: "1.2 km", phone: "029559012" },
  { name: "Gulshan Police Station",     dist: "2.5 km", phone: "029882112" },
  { name: "Banani Police Station",      dist: "3.1 km", phone: "029884001" },
];

const TIPS = [
  "Move to a safe place if possible",
  "Avoid confrontation",
  "Note any identifying details",
  "Stay on the line with emergency services",
];

export default function PoliceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selected, setSelected]           = useState<string | null>(null);
  const [description, setDescription]     = useState("");
  const [location, setLocation]           = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading]             = useState(false);
  const [panicLoading, setPanicLoading]   = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  const requireLocation = () => {
    if (!location) {
      Alert.alert("GPS unavailable", "Please enable location services.");
      return false;
    }
    return true;
  };

  const handlePanic = async () => {
    if (!user || !requireLocation()) return;
    setPanicLoading(true);
    try {
      await sendSOSAlert(user.uid, location!.latitude, location!.longitude);
      Alert.alert("🚨 Panic Mode Activated", "Police alerted with your live location.");
    } catch {
      Alert.alert("Error", "Could not activate Panic Mode.");
    } finally { setPanicLoading(false); }
  };

  const handleSilent = async () => {
    if (!user || !requireLocation()) return;
    try {
      await sendSOSAlert(user.uid, location!.latitude, location!.longitude);
      Alert.alert("📡 Silent Alert Sent", "Your location was shared silently.");
    } catch {
      Alert.alert("Error", "Could not send silent alert.");
    }
  };

  const handleSubmit = async () => {
    if (!selected)           return Alert.alert("Missing field", "Please select an incident type.");
    if (!description.trim()) return Alert.alert("Missing field", "Please describe the incident.");
    if (!requireLocation())  return;
    if (!user) return;
    setLoading(true);
    try {
      await submitPoliceReport({
        uid: user.uid,
        type: selected as any,
        description,
        location: location!,
        evidenceUrls: [],
        status: "pending",
        isSOS: false,
      });
      Alert.alert("✅ Report Submitted", "Authorities have been notified.");
      setSelected(null);
      setDescription("");
    } catch {
      Alert.alert("Error", "Submission failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0eb" }}>
      <StatusBar style="light" />

      {/* Header with back button */}
      <View style={{
        backgroundColor: "#1a4a4a",
        paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>অভয়</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>LifeLine BD</Text>
          </View>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 18 }}>☰</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={{
          backgroundColor: "#c4451a", margin: 12, borderRadius: 16,
          padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}>
          <View style={{ flex: 1 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center", marginBottom: 8,
            }}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 24 }}>
              Police{"\n"}Emergency
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 }}>
              Emergency law enforcement assistance
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL("tel:999")}
            style={{
              backgroundColor: "#fff", borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10,
              alignItems: "center", minWidth: 72,
            }}
          >
            <Text style={{ fontSize: 10, color: "#9ca3af" }}>Call Police:</Text>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#c4451a" }}>999</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 12 }}>

          {/* Panic Mode */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 }}>
            Panic Mode
          </Text>
          <TouchableOpacity
            onPress={handlePanic} disabled={panicLoading}
            style={{
              backgroundColor: "#2d3748", borderRadius: 10,
              paddingVertical: 14, alignItems: "center",
              flexDirection: "row", justifyContent: "center",
              marginBottom: 8,
            }}
          >
            {panicLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>⚠️  Activate Panic Mode</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSilent}
            style={{
              backgroundColor: "#c4451a", borderRadius: 10,
              paddingVertical: 14, alignItems: "center",
              flexDirection: "row", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>⚠️  Send Silent Alert</Text>
          </TouchableOpacity>
          <Text style={{ color: "#c4451a", fontSize: 11, textAlign: "center", marginTop: 6, marginBottom: 16 }}>
            ⚠️ Sends location without sound/notification
          </Text>

          {/* Incident Type */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {INCIDENTS.map((inc) => (
              <TouchableOpacity
                key={inc.value}
                onPress={() => setSelected(inc.value)}
                style={{
                  width: "47.5%",
                  backgroundColor: selected === inc.value ? "#fdf0eb" : "#fff",
                  borderRadius: 12, borderWidth: 1,
                  borderColor: selected === inc.value ? "#c4451a" : "#e8e4df",
                  paddingVertical: 14, alignItems: "center", gap: 6,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 20 }}>{inc.icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: "500", color: "#1a1a1a", textAlign: "center" }}>
                  {inc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <TextInput
            value={description} onChangeText={setDescription}
            multiline placeholder="Describe what happened..."
            placeholderTextColor="#9ca3af"
            style={{
              backgroundColor: "#fff", borderWidth: 1, borderColor: "#e8e4df",
              borderRadius: 12, padding: 12, fontSize: 13, color: "#1a1a1a",
              minHeight: 90, textAlignVertical: "top", marginBottom: 6,
            }}
          />
          <Text style={{ color: "#c4451a", fontSize: 13, fontWeight: "500", marginBottom: 16 }}>
            🎤  Or record voice note
          </Text>

          {/* Upload */}
          <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Photos, videos, or documents</Text>
          <TouchableOpacity style={{
            borderWidth: 1.5, borderStyle: "dashed", borderColor: "#d1d5db",
            borderRadius: 12, paddingVertical: 28, alignItems: "center",
            backgroundColor: "#fff", gap: 6, marginBottom: 16,
          }}>
            <Text style={{ fontSize: 26 }}>⬆️</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>Click to upload files</Text>
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>Images, videos, or documents</Text>
          </TouchableOpacity>

          {/* Location */}
          <View style={{
            backgroundColor: "#f0faf5", borderWidth: 1, borderColor: "#bbf0d8",
            borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 4,
          }}>
            <Text style={{ fontSize: 26 }}>📍</Text>
            <Text style={{ fontSize: 12, color: "#1a7a4a", marginTop: 4 }}>Dhaka, Bangladesh</Text>
            {location && (
              <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>
            📍 Current Location: Dhaka, Bangladesh
          </Text>

          {/* Nearby Stations */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 }}>
            📍 Nearby Police Stations
          </Text>
          {STATIONS.map((s) => (
            <View key={s.name} style={{
              backgroundColor: "#fff", borderRadius: 12, borderWidth: 1,
              borderColor: "#e8e4df", padding: 12, marginBottom: 8,
            }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>{s.name}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 6 }}>
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>Distance:</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#c4451a" }}>{s.dist}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${s.phone}`)}
                style={{
                  backgroundColor: "#c4451a", borderRadius: 8,
                  paddingVertical: 9, alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>📞  Call Station</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Tips */}
          <View style={{
            backgroundColor: "#fff8e8", borderWidth: 1, borderColor: "#f5d78a",
            borderRadius: 12, padding: 14, marginBottom: 16, marginTop: 8,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#8a6a00", marginBottom: 10 }}>
              ⚠️  Emergency Tips
            </Text>
            {TIPS.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: "#c4451a",
                  alignItems: "center", justifyContent: "center", marginTop: 1,
                }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 12, color: "#1a1a1a", flex: 1, lineHeight: 18 }}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit} disabled={loading}
            style={{
              backgroundColor: "#c4451a", borderRadius: 10,
              paddingVertical: 14, alignItems: "center", marginBottom: 30,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>📞  Submit Report</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}