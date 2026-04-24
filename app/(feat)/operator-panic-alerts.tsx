import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy,
  onSnapshot, updateDoc, doc, where,
} from "firebase/firestore";

type PanicAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  reportedBy: string;
  severity: "high" | "normal";
  read: boolean;
  createdAt: any;
  location?: {
    latitude: number;
    longitude: number;
    mapsLink: string;
  };
};

export default function OperatorAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Real-time listener filtered to panicAlert only ──
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("type", "==", "panicAlert"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: PanicAlert[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PanicAlert, "id">),
      }));
      setAlerts(list);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error("Failed to fetch panic alerts:", err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#7c3aed", paddingTop: 56, paddingBottom: 20,
        paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)", width: 36, height: 36,
            borderRadius: 18, alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Panic Alerts</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {unreadCount > 0
              ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: "#dc2626", borderRadius: 12,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {unreadCount}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading panic alerts...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={["#7c3aed"]}
            />
          }
        >
          {alerts.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛡️</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No panic alerts
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Women safety panic alerts will appear here
              </Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <View
                key={alert.id}
                style={{
                  backgroundColor: alert.read ? "#fff" : "#fef2f2",
                  borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 1,
                  borderColor: alert.read ? "#f3f4f6" : "#fecaca",
                  elevation: alert.read ? 0 : 2,
                  shadowColor: "#dc2626",
                  shadowOpacity: alert.read ? 0 : 0.08,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* Top row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>🚨</Text>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14, flex: 1 }}>
                        {alert.title}
                      </Text>
                      {!alert.read && (
                        <View style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: "#dc2626",
                        }} />
                      )}
                    </View>
                    <Text style={{ color: "#4b5563", fontSize: 13, lineHeight: 18 }}>
                      {alert.body}
                    </Text>
                  </View>
                </View>

                {/* Severity badge */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <View style={{
                    backgroundColor: alert.severity === "high" ? "#fef2f2" : "#f0fdf4",
                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: alert.severity === "high" ? "#fecaca" : "#86efac",
                  }}>
                    <Text style={{
                      fontSize: 11, fontWeight: "700",
                      color: alert.severity === "high" ? "#dc2626" : "#15803d",
                    }}>
                      {alert.severity === "high" ? "🔴 High Severity" : "🟢 Normal"}
                    </Text>
                  </View>
                </View>

                {/* Location (if available) */}
                {alert.location?.mapsLink && (
                  <View style={{
                    backgroundColor: "#f8fafc", borderRadius: 10,
                    padding: 12, marginBottom: 12,
                    borderWidth: 1, borderColor: "#e2e8f0",
                  }}>
                    <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                      📍 LOCATION
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                      {alert.location.latitude?.toFixed(5)}, {alert.location.longitude?.toFixed(5)}
                    </Text>
                  </View>
                )}

                {/* Timestamp */}
                <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 12 }}>
                  🕐 {formatTime(alert.createdAt)}  •  By {alert.reportedBy}
                </Text>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {alert.location?.mapsLink && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(alert.location!.mapsLink)}
                      style={{
                        flex: 1, backgroundColor: "#7c3aed", borderRadius: 10,
                        paddingVertical: 10, alignItems: "center",
                        flexDirection: "row", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🗺️</Text>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                        Open Map
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!alert.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkRead(alert.id)}
                      style={{
                        flex: 1, backgroundColor: "#f3f4f6", borderRadius: 10,
                        paddingVertical: 10, alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#374151", fontWeight: "600", fontSize: 13 }}>
                        ✓ Mark Read
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
