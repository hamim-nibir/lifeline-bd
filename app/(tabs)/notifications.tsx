import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";

type AppNotification = {
  id: string;
  title: string;
  body: string;
  type?: string;
  severity?: "high" | "normal";
  read?: boolean;
  createdAt?: any;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppNotification, "id">),
        }));
        setNotifications(list);
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

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#f97316",
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Real-time alerts and updates
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: "#dc2626",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={{ color: "#9ca3af", marginTop: 10 }}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={["#f97316"]}
            />
          }
        >
          {notifications.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 32,
                borderWidth: 1,
                borderColor: "#f3f4f6",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 34, marginBottom: 10 }}>🔕</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15 }}>No alerts yet</Text>
              <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                You will receive real-time updates here
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: item.read ? "#fff" : "#fff7ed",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: item.read ? "#f3f4f6" : "#fed7aa",
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14, flex: 1 }}>
                    {item.title || "Notification"}
                  </Text>
                  {!item.read && <Text style={{ color: "#ea580c", fontWeight: "700", fontSize: 11 }}>NEW</Text>}
                </View>
                <Text style={{ color: "#4b5563", fontSize: 12, lineHeight: 18 }}>{item.body || "Update received"}</Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <Text style={{ color: "#9ca3af", fontSize: 11 }}>{formatTime(item.createdAt)}</Text>
                  {!item.read && (
                    <TouchableOpacity
                      onPress={() => markRead(item.id)}
                      style={{
                        backgroundColor: "#f3f4f6",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: "#374151", fontSize: 11, fontWeight: "700" }}>Mark Read</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  muted: { color: "#9ca3af", fontSize: 15, textAlign: "center" },
  header: {
    backgroundColor: "#fff",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  list: { padding: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardUnread: { borderColor: "#ddd6fe", backgroundColor: "#faf5ff" },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2937" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7c3aed",
    marginTop: 5,
  },
  body: { marginTop: 6, fontSize: 13, color: "#4b5563", lineHeight: 18 },
  time: { marginTop: 10, fontSize: 11, color: "#9ca3af", fontWeight: "600" },
});
