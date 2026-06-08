import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";
import { acceptSOSByOperator } from "../../services/sos";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";

type SOSAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  reportedBy: string;
  reportedByUid?: string;
  severity: "high" | "normal";
  read: boolean;
  createdAt: any;
  sosEventId?: string;
  operatorAccepted?: boolean;
  sosCancelled?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    mapsLink: string;
  };
};

export default function OperatorSOSAlertsScreen() {
  const router = useRouter();
  const { accountType, user } = useAuthStore();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (accountType && accountType !== "operator") {
      router.replace("/(tabs)");
    }
  }, [accountType, router]);

  useEffect(() => {
    const q = query(collection(db, "sos_alerts"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SOSAlert[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SOSAlert, "id">),
        }));
        setAlerts(list);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("Failed to fetch SOS alerts:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "sos_alerts", id), { read: true });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleAccept = async (alert: SOSAlert) => {
    if (!alert.sosEventId || !user?.uid) {
      Alert.alert("Cannot accept", "This alert is missing SOS event data.");
      return;
    }
    if (alert.sosCancelled) return;
    try {
      setAcceptingId(alert.id);
      await acceptSOSByOperator({
        sosEventId: alert.sosEventId,
        sosAlertId: alert.id,
        operatorUid: user.uid,
      });
      await updateDoc(doc(db, "sos_alerts", alert.id), { read: true });
    } catch (e: any) {
      Alert.alert("Accept failed", e?.message ?? "Could not accept this SOS.");
    } finally {
      setAcceptingId(null);
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

  const unreadCount = alerts.filter((a) => !a.read).length;

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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>SOS Alerts</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {unreadCount > 0
              ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading SOS alerts...</Text>
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
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 40,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🚨</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>No SOS alerts</Text>
              <Text
                style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}
              >
                SOS alerts from users will appear here
              </Text>
            </View>
          ) : (
            alerts.map((alert) => {
              const canAccept =
                !!alert.sosEventId && !alert.operatorAccepted && !alert.sosCancelled;
              return (
                <View
                  key={alert.id}
                  style={{
                    backgroundColor: alert.read ? "#fff" : "#fef2f2",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: alert.read ? "#f3f4f6" : "#fecaca",
                  }}
                >
                  <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                    {alert.title}
                  </Text>
                  <Text style={{ color: "#4b5563", fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                    {alert.body}
                  </Text>
                  {alert.sosCancelled && (
                    <Text style={{ color: "#b91c1c", fontSize: 12, marginTop: 8, fontWeight: "600" }}>
                      Cancelled by user
                    </Text>
                  )}
                  {alert.operatorAccepted && !alert.sosCancelled && (
                    <Text style={{ color: "#15803d", fontSize: 12, marginTop: 8, fontWeight: "600" }}>
                      Accepted — responder dispatched
                    </Text>
                  )}
                  {alert.location?.mapsLink && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(alert.location!.mapsLink)}
                      style={{
                        marginTop: 10,
                        backgroundColor: "#7c3aed",
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                        Open Map
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canAccept && (
                    <TouchableOpacity
                      disabled={acceptingId === alert.id}
                      onPress={() => void handleAccept(alert)}
                      style={{
                        marginTop: 10,
                        backgroundColor: "#15803d",
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: "center",
                        opacity: acceptingId === alert.id ? 0.75 : 1,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                        {acceptingId === alert.id ? "Accepting…" : "Accept SOS"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 10 }}>
                    🕐 {formatTime(alert.createdAt)} • By {alert.reportedBy}
                  </Text>
                  {!alert.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkRead(alert.id)}
                      style={{
                        marginTop: 10,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#374151", fontWeight: "600", fontSize: 13 }}>
                        ✓ Mark Read
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
