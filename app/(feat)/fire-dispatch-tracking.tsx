import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

type DispatchStatus = "dispatched" | "acknowledged" | "in_progress" | "resolved";

type DispatchDoc = {
  service: string;
  userId: string;
  status: DispatchStatus;
  incidentType?: string;
  severity?: string;
  peopleTrapped?: string;
  notes?: string;
  contactNumber?: string;
  requesterLocation?: {
    latitude: number;
    longitude: number;
    mapsLink: string;
    address?: string;
  } | null;
};

const STATUS_STEPS = ["Received", "Dispatched", "Enroute", "On Scene", "Contained"];

const getProgress = (status: DispatchStatus) => {
  if (status === "dispatched") return 2;
  if (status === "acknowledged") return 3;
  if (status === "in_progress") return 4;
  return 5;
};

export default function FireDispatchTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dispatchId?: string; service?: string }>();
  const dispatchId = params.dispatchId ?? "";
  const [loading, setLoading] = useState(true);
  const [dispatch, setDispatch] = useState<DispatchDoc | null>(null);
  const [incidentType, setIncidentType] = useState("Building Fire");
  const [severity, setSeverity] = useState("Medium");
  const [peopleTrapped, setPeopleTrapped] = useState("No");
  const [notes, setNotes] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!dispatchId) return;
    const unsub = onSnapshot(doc(db, "fire_dispatches", dispatchId), (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.data() as DispatchDoc;
      setDispatch(data);
      setIncidentType(data.incidentType ?? "Building Fire");
      setSeverity(data.severity ?? "Medium");
      setPeopleTrapped(data.peopleTrapped ?? "No");
      setNotes(data.notes ?? "");
      setContactNumber(data.contactNumber ?? "");
      setLoading(false);
    });
    return () => unsub();
  }, [dispatchId]);

  useEffect(() => {
    if (!dispatchId) return;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 8000,
          distanceInterval: 15,
        },
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          await updateDoc(doc(db, "fire_dispatches", dispatchId), {
            requesterLocation: { latitude, longitude, mapsLink },
            updatedAt: new Date().toISOString(),
          });
        }
      );
    })();

    return () => sub?.remove();
  }, [dispatchId]);

  const progress = useMemo(() => getProgress(dispatch?.status ?? "dispatched"), [dispatch?.status]);

  const updateIncident = async () => {
    if (!dispatchId) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "fire_dispatches", dispatchId), {
        incidentType,
        severity,
        peopleTrapped,
        notes,
        contactNumber,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert("Updated", "Incident details updated successfully.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>Loading fire dispatch...</Text>
      </View>
    );
  }

  const location = dispatch?.requesterLocation;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#64748b", fontWeight: "600", marginTop: 40, marginBottom: 8 }}>← Back to Home</Text>
        </TouchableOpacity>

        <View style={{
          backgroundColor: "#ea580c",
          borderRadius: 14,
          padding: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <View>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 31/1.5 }}>{params.service ?? dispatch?.service ?? "Fire Emergency"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 }}>ETA: 3-5 minutes</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <Text style={{ color: "#9a3412", fontWeight: "700", fontSize: 12 }}>📞 Call Fire: 999</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1.2, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
            <Text style={{ color: "#111827", fontWeight: "800", fontSize: 20/1.5, padding: 12 }}>Live Incident Map</Text>
            <View style={{ height: 260 }}>
              {location ? (
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="Your Location" />
                </MapView>
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                  <Text style={{ color: "#9ca3af" }}>Waiting for live location...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flex: 0.9, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12 }}>
            <Text style={{ color: "#111827", fontWeight: "800", fontSize: 18/1.5 }}>Incident Details</Text>
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>Help responders by adding details.</Text>

            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12, marginTop: 10 }}>Incident Type</Text>
            <TextInput value={incidentType} onChangeText={setIncidentType} style={input} />

            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12, marginTop: 8 }}>Severity Level</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              {["Low", "Medium", "Critical"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSeverity(item)}
                  style={{
                    flex: 1,
                    backgroundColor: severity === item ? "#ea580c" : "#f3f4f6",
                    borderRadius: 8,
                    paddingVertical: 7,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: severity === item ? "#fff" : "#6b7280", fontSize: 11, fontWeight: "700" }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12, marginTop: 8 }}>People Trapped</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              {["No", "Yes"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setPeopleTrapped(item)}
                  style={{
                    flex: 1,
                    backgroundColor: peopleTrapped === item ? "#16a34a" : "#f3f4f6",
                    borderRadius: 8,
                    paddingVertical: 7,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: peopleTrapped === item ? "#fff" : "#6b7280", fontSize: 11, fontWeight: "700" }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12, marginTop: 8 }}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} multiline style={[input, { minHeight: 65, textAlignVertical: "top" }]} />

            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12, marginTop: 8 }}>Contact Number</Text>
            <TextInput value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" style={input} />

            <TouchableOpacity
              onPress={updateIncident}
              disabled={updating}
              style={{
                marginTop: 10,
                backgroundColor: "#ea580c",
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{updating ? "Updating..." : "Update Incident"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12 }}>
          <Text style={{ color: "#111827", fontWeight: "800", fontSize: 19/1.5, marginBottom: 12 }}>Response Status Timeline</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {STATUS_STEPS.map((step, idx) => {
              const active = idx < progress;
              return (
                <View key={step} style={{ alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: active ? "#22c55e" : "#e5e7eb",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: active ? "#fff" : "#6b7280", fontSize: 11, fontWeight: "700" }}>
                      {active ? "✓" : "•"}
                    </Text>
                  </View>
                  <Text style={{ color: active ? "#15803d" : "#9ca3af", fontSize: 10, marginTop: 6, textAlign: "center" }}>{step}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const input = {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginTop: 4,
  fontSize: 12,
  backgroundColor: "#fff",
};
