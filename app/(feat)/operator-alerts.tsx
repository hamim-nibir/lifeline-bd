import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy,
  getDocs, updateDoc, doc,
} from "firebase/firestore";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  reportedBy: string;
  accidentType: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    mapsLink: string;
  };
  severity: "high" | "normal";
  read: boolean;
  createdAt: any;
};

export default function OperatorAlertsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const q = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Notification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Notification, "id">),
      }));
      setNotifications(list);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleOpenMap = (mapsLink: string) => {
    Linking.openURL(mapsLink);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    const date: Date = timestamp.toDate();
    return date.toLocaleString("en-BD", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Alerts</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
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
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading alerts...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              colors={["#7c3aed"]}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No alerts yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Accident reports and panic alerts will appear here
              </Text>
            </View>
          ) : (
            notifications.map((notif) => (
              <View
                key={notif.id}
                style={{
                  backgroundColor: notif.read ? "#fff" : "#fdf4ff",
                  borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 1,
                  borderColor: notif.read ? "#f3f4f6" : "#e9d5ff",
                  elevation: notif.read ? 0 : 2,
                  shadowColor: "#7c3aed",
                  shadowOpacity: notif.read ? 0 : 0.08,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* Top row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>
                        {notif.type === "accidentReport" ? "🚨" : "🔔"}
                      </Text>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14, flex: 1 }}>
                        {notif.title}
                      </Text>
                      {!notif.read && (
                        <View style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: "#7c3aed",
                        }} />
                      )}
                    </View>
                    <Text style={{ color: "#4b5563", fontSize: 13, lineHeight: 18 }}>
                      {notif.body}
                    </Text>
                  </View>
                </View>

                {/* Severity badge */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <View style={{
                    backgroundColor: notif.severity === "high" ? "#fef2f2" : "#f0fdf4",
                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: notif.severity === "high" ? "#fecaca" : "#86efac",
                  }}>
                    <Text style={{
                      fontSize: 11, fontWeight: "700",
                      color: notif.severity === "high" ? "#dc2626" : "#15803d",
                    }}>
                      {notif.severity === "high" ? "🔴 High Severity" : "🟢 Normal"}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: "#f5f3ff", borderRadius: 20,
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1, borderColor: "#ddd6fe",
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#7c3aed" }}>
                      {notif.accidentType}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={{
                  backgroundColor: "#f8fafc", borderRadius: 10,
                  padding: 12, marginBottom: 12,
                  borderWidth: 1, borderColor: "#e2e8f0",
                }}>
                  <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                    📍 LOCATION
                  </Text>
                  <Text style={{ color: "#374151", fontSize: 12, lineHeight: 18 }}>
                    {notif.location?.address ?? "Address not available"}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                    {notif.location?.latitude?.toFixed(5)}, {notif.location?.longitude?.toFixed(5)}
                  </Text>
                </View>

                {/* Timestamp */}
                <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 12 }}>
                  🕐 {formatTime(notif.createdAt)}  •  Reported by {notif.reportedBy}
                </Text>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleOpenMap(notif.location?.mapsLink)}
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

                  {!notif.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkRead(notif.id)}
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