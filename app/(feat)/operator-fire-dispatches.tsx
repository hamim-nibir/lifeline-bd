import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../services/firebase";

type FireDispatchStatus = "dispatched" | "acknowledged" | "in_progress" | "resolved";

type FireDispatch = {
  id: string;
  service: string;
  userId: string;
  status: FireDispatchStatus;
  source?: string;
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
  createdAt?: any;
  updatedAt?: any;
};

const FLOW: FireDispatchStatus[] = ["dispatched", "acknowledged", "in_progress", "resolved"];

export default function OperatorFireDispatchesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<FireDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "fire_dispatches"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FireDispatch, "id">),
        }));
        setItems(rows);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, []);

  const markStatus = async (id: string, status: FireDispatchStatus) => {
    await updateDoc(doc(db, "fire_dispatches", id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#7c3aed",
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
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
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Fire Dispatches</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
            {items.length} dispatch request{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 10 }}>Loading fire dispatches...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={["#7c3aed"]}
            />
          }
        >
          {items.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 28,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 40 }}>🔥</Text>
              <Text style={{ marginTop: 8, color: "#374151", fontWeight: "700" }}>
                No fire dispatch requests
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#f3f4f6",
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: "#111827", fontSize: 15, fontWeight: "800" }}>{item.service}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>User: {item.userId}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  Status: <Text style={{ fontWeight: "700", textTransform: "capitalize" }}>{item.status}</Text>
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  Severity: {item.severity ?? "Medium"} | Trapped: {item.peopleTrapped ?? "No"}
                </Text>
                {item.requesterLocation?.mapsLink && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.requesterLocation!.mapsLink)}
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      backgroundColor: "#7c3aed",
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Open Live Map</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {FLOW.map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => markStatus(item.id, status)}
                      style={{
                        backgroundColor: item.status === status ? "#ede9fe" : "#f3f4f6",
                        borderWidth: 1,
                        borderColor: item.status === status ? "#c4b5fd" : "#e5e7eb",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: item.status === status ? "#5b21b6" : "#6b7280",
                          fontWeight: "700",
                          textTransform: "capitalize",
                        }}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
