import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
  "Flood",
  "Cyclone",
  "Earthquake",
  "Landslide",
  "Fire (Wildfire)",
  "Other",
];

export default function DisasterAlertScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();

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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Disaster Alert</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            Report natural disasters and request rescue
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[cardStyle, !disasterType && { borderColor: "#c4b5fd" }]}>
          <Text style={sectionTitleStyle}>
            Disaster Type <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          {DISASTER_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setDisasterType(type)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
            >
              <View style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: disasterType === type ? "#7c3aed" : "#d1d5db",
                alignItems: "center",
                justifyContent: "center",
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
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: urgency === level ? "#7c3aed" : "#f3f4f6",
                  borderWidth: 1,
                  borderColor: urgency === level ? "#7c3aed" : "#e5e7eb",
                }}
              >
                <Text style={{
                  color: urgency === level ? "#fff" : "#374151",
                  fontWeight: "700",
                  fontSize: 13,
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
            placeholder="Describe the disaster, damage, and immediate needs..."
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
              backgroundColor: "#f5f3ff",
              borderWidth: 1,
              borderColor: "#c4b5fd",
              borderRadius: 12,
              padding: 14,
              marginTop: 8,
              marginBottom: 10,
            }}>
              <Text style={{ color: "#5b21b6", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
                ✅ Location captured
              </Text>
              <Text style={{ color: "#4c1d95", fontSize: 12, lineHeight: 18 }}>
                {location.address}
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, marginBottom: 10 }}>
              Share your live location so rescue teams can reach you
            </Text>
          )}
          <TouchableOpacity
            onPress={handleShareLocation}
            disabled={locLoading}
            style={{
              backgroundColor: location ? "#f5f3ff" : "#7c3aed",
              borderWidth: location ? 1 : 0,
              borderColor: "#c4b5fd",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {locLoading ? (
              <ActivityIndicator color={location ? "#5b21b6" : "#fff"} />
            ) : (
              <>
                <Text style={{ fontSize: 18 }}>📍</Text>
                <Text style={{ color: location ? "#5b21b6" : "#fff", fontWeight: "700", fontSize: 14 }}>
                  {location ? "Update Location" : "Share My Location"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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
            <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2,
              backgroundColor: "#7c3aed",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              elevation: 3,
              shadowColor: "#7c3aed",
              shadowOpacity: 0.3,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>🌩️</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Send Alert</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
