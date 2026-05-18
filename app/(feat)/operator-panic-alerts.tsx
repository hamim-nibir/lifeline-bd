import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
  Modal, FlatList, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, where, addDoc,
  serverTimestamp, getDocs,
} from "firebase/firestore";

type PanicAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  reportedBy: string;
  reportedByUid: string;
  citizenName: string;
  citizenPhone: string;
  severity: "high" | "normal";
  read: boolean;
  resolved: boolean;
  assignedVolunteer: string | null;
  createdAt: any;
  location?: {
    latitude: number;
    longitude: number;
    mapsLink: string;
  };
};

type Volunteer = {
  uid: string;
  name: string;
  nickname: string;
  phone: string;
};

export default function OperatorAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Volunteer assignment state
  const [volunteerModal, setVolunteerModal] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PanicAlert | null>(null);
  const [assigning, setAssigning] = useState(false);

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
      console.error(err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        resolved: true, read: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Open volunteer assignment modal
  const openAssignModal = async (alert: PanicAlert) => {
    setSelectedAlert(alert);
    setVolunteerModal(true);
    setLoadingVolunteers(true);
    try {
      const q = query(
        collection(db, "users"),
        where("accountType", "==", "volunteer")
      );
      const snap = await getDocs(q);
      const list: Volunteer[] = snap.docs.map((d) => ({
        uid: d.id,
        name: d.data().name ?? "—",
        nickname: d.data().nickname ?? "—",
        phone: d.data().phone ?? "Not provided",
      }));
      setVolunteers(list);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load volunteers.");
    } finally {
      setLoadingVolunteers(false);
    }
  };

  // Assign volunteer and send notification
  const handleAssignVolunteer = async (volunteer: Volunteer) => {
    if (!selectedAlert) return;
    setAssigning(true);
    try {
      // 1. Update the panic alert notification
      await updateDoc(doc(db, "notifications", selectedAlert.id), {
        assignedVolunteer: volunteer.uid,
        assignedVolunteerName: volunteer.name,
        read: true,
      });

      // 2. Send notification to volunteer
      await addDoc(collection(db, "notifications"), {
        type: "volunteerAssignment",
        forUid: volunteer.uid,
        title: "🆘 You have been assigned to an emergency",
        body: `Please assist ${selectedAlert.citizenName} immediately.`,
        citizenName: selectedAlert.citizenName,
        citizenPhone: selectedAlert.citizenPhone,
        reportedByUid: selectedAlert.reportedByUid,
        location: selectedAlert.location,
        read: false,
        createdAt: serverTimestamp(),
      });

      setVolunteerModal(false);
      setSelectedAlert(null);
      Alert.alert(
        "✅ Assigned",
        `${volunteer.name} has been notified and assigned to this emergency.`
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to assign volunteer.");
    } finally {
      setAssigning(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const unreadCount = alerts.filter((a) => !a.read && !a.resolved).length;

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
            {unreadCount > 0 ? `${unreadCount} active alert${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: "#dc2626", borderRadius: 12,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{unreadCount}</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} colors={["#7c3aed"]} />
          }
        >
          {alerts.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛡️</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>No panic alerts</Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Women safety panic alerts will appear here
              </Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <View
                key={alert.id}
                style={{
                  backgroundColor: alert.resolved ? "#f0fdf4" : alert.read ? "#fff" : "#fef2f2",
                  borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 1,
                  borderColor: alert.resolved ? "#86efac" : alert.read ? "#f3f4f6" : "#fecaca",
                  elevation: alert.read ? 0 : 2,
                  shadowColor: "#dc2626",
                  shadowOpacity: alert.read ? 0 : 0.08,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* Title row */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>🚨</Text>
                  <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14, flex: 1 }}>
                    {alert.title}
                  </Text>
                  {!alert.read && !alert.resolved && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" }} />
                  )}
                  {alert.resolved && (
                    <Text style={{ color: "#15803d", fontSize: 11, fontWeight: "700" }}>✅ Resolved</Text>
                  )}
                </View>

                <Text style={{ color: "#4b5563", fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
                  {alert.body}
                </Text>

                {/* Citizen details card */}
                <View style={{
                  backgroundColor: "#f8fafc", borderRadius: 10,
                  padding: 12, marginBottom: 12,
                  borderWidth: 1, borderColor: "#e2e8f0",
                }}>
                  <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 8 }}>
                    👤 CITIZEN DETAILS
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>Name</Text>
                    <Text style={{ color: "#1f2937", fontSize: 13 }}>{alert.citizenName ?? alert.reportedBy}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>Phone</Text>
                    <TouchableOpacity onPress={() => alert.citizenPhone && Linking.openURL(`tel:${alert.citizenPhone}`)}>
                      <Text style={{ color: "#2563eb", fontSize: 13, textDecorationLine: "underline" }}>
                        {alert.citizenPhone ?? "Not provided"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {alert.assignedVolunteer && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>Assigned</Text>
                      <Text style={{ color: "#15803d", fontSize: 13 }}>✅ {(alert as any).assignedVolunteerName}</Text>
                    </View>
                  )}
                </View>

                {/* Location */}
                {alert.location && (
                  <TouchableOpacity
                    onPress={() => alert.location?.mapsLink && Linking.openURL(alert.location.mapsLink)}
                    style={{
                      backgroundColor: "#fef2f2", borderRadius: 10,
                      padding: 12, marginBottom: 12,
                      borderWidth: 1, borderColor: "#fecaca",
                      flexDirection: "row", alignItems: "center", gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "700", marginBottom: 2 }}>
                        TAP TO OPEN LIVE LOCATION
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                        {alert.location.latitude?.toFixed(5)}, {alert.location.longitude?.toFixed(5)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16 }}>🗺️</Text>
                  </TouchableOpacity>
                )}

                {/* Timestamp */}
                <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 12 }}>
                  🕐 {formatTime(alert.createdAt)}
                </Text>

                {/* Action buttons */}
                {!alert.resolved && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {!alert.read && (
                      <TouchableOpacity
                        onPress={() => handleMarkRead(alert.id)}
                        style={{
                          flex: 1, backgroundColor: "#f3f4f6", borderRadius: 10,
                          paddingVertical: 10, alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12 }}>✓ Mark Read</Text>
                      </TouchableOpacity>
                    )}

                    {/* Assign Volunteer button */}
                    {!alert.assignedVolunteer && (
                      <TouchableOpacity
                        onPress={() => openAssignModal(alert)}
                        style={{
                          flex: 2, backgroundColor: "#7c3aed", borderRadius: 10,
                          paddingVertical: 10, alignItems: "center",
                          flexDirection: "row", justifyContent: "center", gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>👤</Text>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Assign Volunteer</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleResolve(alert.id)}
                      style={{
                        flex: 1, backgroundColor: "#f0fdf4", borderRadius: 10,
                        paddingVertical: 10, alignItems: "center",
                        borderWidth: 1, borderColor: "#86efac",
                      }}
                    >
                      <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 12 }}>✅ Resolve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Volunteer Assignment Modal ── */}
      <Modal
        visible={volunteerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setVolunteerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
            maxHeight: "75%",
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
                👤 Select a Volunteer
              </Text>
              <TouchableOpacity
                onPress={() => setVolunteerModal(false)}
                style={{
                  backgroundColor: "#f3f4f6", borderRadius: 20,
                  width: 32, height: 32, alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingVolunteers ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading volunteers...</Text>
              </View>
            ) : volunteers.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>😕</Text>
                <Text style={{ color: "#374151", fontWeight: "700" }}>No volunteers available</Text>
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                  No registered volunteers found
                </Text>
              </View>
            ) : (
              <FlatList
                data={volunteers}
                keyExtractor={(item) => item.uid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    paddingVertical: 14, borderBottomWidth: 1,
                    borderBottomColor: "#f3f4f6", gap: 12,
                  }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: "#f5f3ff",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 20 }}>🙋</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 12 }}>@{item.nickname}</Text>
                      <Text style={{ color: "#2563eb", fontSize: 12 }}>📞 {item.phone}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAssignVolunteer(item)}
                      disabled={assigning}
                      style={{
                        backgroundColor: "#7c3aed", borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 8,
                      }}
                    >
                      {assigning ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Assign</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}