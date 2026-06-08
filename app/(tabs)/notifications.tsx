import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
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
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { markNotificationRead } from "../../services/notifications";
import { useAuthStore } from "../../store/authStore";

type InboxNotification = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  read?: boolean;
  createdAt?: { toDate?: () => Date };
  ambulanceRequestId?: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("reportedByUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<InboxNotification, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user?.uid]);

  const formatTime = (timestamp: InboxNotification["createdAt"]) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onOpen = async (n: InboxNotification) => {
    if (n.type === "ambulanceUpdate" && n.ambulanceRequestId) {
      try {
        if (!n.read) await markNotificationRead(n.id);
      } catch {
        /* non-fatal */
      }
      router.push({
        pathname: "/(feat)/ambulance-tracking",
        params: { requestId: n.ambulanceRequestId },
      });
      return;
    }
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch {
        /* rules may block for some legacy doc shapes */
      }
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to see your notifications.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSub}>
          Tap an ambulance update to open live GPS tracking.
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <Text style={styles.muted}>No notifications yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => onOpen(item)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title || "Update"}
              </Text>
              {!item.read ? <View style={styles.dot} /> : null}
            </View>
            {item.body ? (
              <Text style={styles.body} numberOfLines={3}>
                {item.body}
              </Text>
            ) : null}
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </TouchableOpacity>
        )}
      />
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
