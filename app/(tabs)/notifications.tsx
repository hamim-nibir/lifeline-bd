import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  TextInput, Alert, Animated, Dimensions, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, where, addDoc, serverTimestamp,
  getDoc, deleteDoc,
} from "firebase/firestore";

import AppHeader from "../../components/AppHeader";
import Sidebar from "../../components/ui/Sidebar";       // ✅ Fix 1 — added missing import
import { logoutUser } from "../../services/auth";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  forUid?: string;
  reportId?: string;
  reportedBy?: string;
  reportedByUid?: string;
  accidentType?: string;
  severity?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    mapsLink: string;
  };
  bloodRequestId?: string;
  requesterId?: string;
  requesterName?: string;
  requesterNickname?: string;
  read: boolean;
  createdAt: any;
};

type RequesterDetails = {
  name: string;
  nickname: string;
  email: string;
  phone: string;
  bloodGroup: string;
};

const NOTIF_ICONS: Record<string, string> = {
  accidentReport: "🚨",
  panicAlert: "🆘",
  verificationUpdate: "🪪",
  bloodRequest: "🩸",
  bloodRequestRejected: "❌",
  default: "🔔",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, accountType, nickname } = useAuthStore(); // ✅ Fix 2 — added nickname
  const uid = user?.uid ?? "";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionModal, setActionModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [requesterDetails, setRequesterDetails] = useState<RequesterDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [sendingReject, setSendingReject] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  const handleLogout = async () => {
    closeSidebar();
    await logoutUser();
    router.replace("/login");
  };

  useEffect(() => {
    if (!uid) return;

    const q = accountType === "operator"
      ? query(collection(db, "notifications"), orderBy("createdAt", "desc"))
      : query(
          collection(db, "notifications"),
          where("forUid", "==", uid),
          orderBy("createdAt", "desc")
        );

    const unsub = onSnapshot(q, (snap) => {
      const list: Notification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Notification, "id">),
      }));
      setNotifications(list);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, [uid, accountType]);

  const handleMarkRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }))
      );
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleDismiss = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Dismiss failed:", err);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All",
      "Remove all notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                notifications.map((n) => deleteDoc(doc(db, "notifications", n.id)))
              );
            } catch (err) {
              console.error("Clear all failed:", err);
            }
          },
        },
      ]
    );
  };

  const handleAction = async (notif: Notification) => {
    setSelectedNotif(notif);
    if (!notif.read) await handleMarkRead(notif.id);

    if (notif.type === "bloodRequest" && notif.requesterId) {
      setLoadingDetails(true);
      setActionModal(true);
      try {
        const snap = await getDoc(doc(db, "users", notif.requesterId));
        if (snap.exists()) {
          const data = snap.data();
          setRequesterDetails({
            name: data.name ?? "—",
            nickname: data.nickname ?? "—",
            email: data.email ?? "—",
            phone: data.phone ?? "—",
            bloodGroup: data.bloodGroup ?? "—",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      routeAction(notif);
    }
  };

  const routeAction = (notif: Notification) => {
    switch (notif.type) {
      case "accidentReport":
        router.push("/(feat)/accident-reports" as any);
        break;
      case "panicAlert":
        router.push("/(feat)/operator-alerts" as any);
        break;
      case "verificationUpdate":
        router.push("/(tabs)/profile" as any);
        break;
      default:
        break;
    }
  };

  const handleOpenChat = async () => {
    if (!selectedNotif?.requesterId || !uid) return;
    const chatId = [uid, selectedNotif.requesterId].sort().join("_");
    try {
      setActionModal(false);
      router.push({
        pathname: "/(feat)/chat",
        params: {
          chatId,
          otherUid: selectedNotif.requesterId,
          otherName: requesterDetails?.nickname ?? selectedNotif.requesterName ?? "User",
        },
      } as any);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedNotif || !uid) return;
    setSendingReject(true);
    try {
      if (selectedNotif.requesterId) {
        await addDoc(collection(db, "notifications"), {
          type: "bloodRequestRejected",
          forUid: selectedNotif.requesterId,
          title: "❌ Blood Request Declined",
          body: rejectMessage.trim()
            ? `Your blood request was declined. Reason: ${rejectMessage.trim()}`
            : "Your blood request was declined.",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      await updateDoc(doc(db, "notifications", selectedNotif.id), {
        read: true,
        actioned: true,
      });
      setRejectModal(false);
      setActionModal(false);
      setRejectMessage("");
      Alert.alert("Done", "The blood request has been declined.");
    } catch (err) {
      Alert.alert("Error", "Failed to send rejection. Please try again.");
    } finally {
      setSendingReject(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    const date: Date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString("en-BD", { day: "2-digit", month: "short" });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── AppHeader ── */}
      <AppHeader
        headerAnim={headerAnim}
        headerOpacity={headerOpacity}
        onOpenSidebar={openSidebar}
      />

      {/* ── Notifications Sub-header ── */}
      <View style={{
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1f2937" }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={{
              backgroundColor: "#dc2626", borderRadius: 12,
              paddingHorizontal: 9, paddingVertical: 3,
            }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={{
                backgroundColor: "#fff7ed",
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 20, borderWidth: 1, borderColor: "#fed7aa",
              }}
            >
              <Text style={{ color: "#c4451a", fontSize: 11, fontWeight: "700" }}>
                ✓ Mark all read
              </Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={{
                backgroundColor: "#fef2f2",
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 20, borderWidth: 1, borderColor: "#fecaca",
              }}
            >
              <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "700" }}>
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#c4451a" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading notifications...</Text>
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
              colors={["#c4451a"]}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No notifications
              </Text>
              <Text style={{
                color: "#9ca3af", fontSize: 13,
                marginTop: 6, textAlign: "center",
              }}>
                Your notifications will appear here
              </Text>
            </View>
          ) : (
            notifications.map((notif) => {
              const icon = NOTIF_ICONS[notif.type] ?? NOTIF_ICONS.default;
              const isUnread = !notif.read;

              return (
                <View
                  key={notif.id}
                  style={{
                    backgroundColor: isUnread ? "#fffbeb" : "#fff",
                    borderRadius: 16, padding: 14, marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isUnread ? "#fde68a" : "#f3f4f6",
                    elevation: isUnread ? 2 : 0,
                    shadowColor: "#f59e0b",
                    shadowOpacity: isUnread ? 0.1 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View style={{
                    flexDirection: "row", gap: 12, marginBottom: 10,
                    alignItems: "flex-start",
                  }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: isUnread ? "#fef3c7" : "#f3f4f6",
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 20 }}>{icon}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: "row", justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}>
                        <Text style={{
                          color: "#1f2937", fontWeight: "700",
                          fontSize: 14, flex: 1, marginRight: 8,
                        }}>
                          {notif.title}
                        </Text>
                        {isUnread && (
                          <View style={{
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: "#c4451a", marginTop: 5, marginRight: 4,
                          }} />
                        )}
                      </View>
                      <Text style={{
                        color: "#4b5563", fontSize: 13,
                        lineHeight: 18, marginTop: 3,
                      }}>
                        {notif.body}
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
                        {formatTime(notif.createdAt)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDismiss(notif.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        width: 26, height: 26, borderRadius: 13,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1,
                      }}
                    >
                      <Text style={{ color: "#9ca3af", fontSize: 13, fontWeight: "700", lineHeight: 16 }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {isUnread && (
                      <TouchableOpacity
                        onPress={() => handleMarkRead(notif.id)}
                        style={{
                          flex: 1, backgroundColor: "#f3f4f6",
                          borderRadius: 8, paddingVertical: 9, alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#374151", fontSize: 12, fontWeight: "600" }}>
                          ✓ Mark Read
                        </Text>
                      </TouchableOpacity>
                    )}

                    {(notif.type === "accidentReport" ||
                      notif.type === "panicAlert" ||
                      notif.type === "bloodRequest" ||
                      notif.type === "verificationUpdate") && (
                      <TouchableOpacity
                        onPress={() => handleAction(notif)}
                        style={{
                          flex: 2,
                          backgroundColor: accountType === "operator" ? "#7c3aed" : "#c4451a",
                          borderRadius: 8, paddingVertical: 9,
                          alignItems: "center", flexDirection: "row",
                          justifyContent: "center", gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>
                          {notif.type === "verificationUpdate" ? "👤" :
                           notif.type === "bloodRequest" ? "🩸" : "→"}
                        </Text>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                          {notif.type === "verificationUpdate"
                            ? "View Profile"
                            : notif.type === "bloodRequest"
                            ? "View Request"
                            : "Take Action"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ══ Blood Request Action Modal ══ */}
      <Modal
        visible={actionModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setActionModal(false);
          setSelectedNotif(null);
          setRequesterDetails(null);
        }}
      >
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
                🩸 Blood Request Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActionModal(false);
                  setSelectedNotif(null);
                  setRequesterDetails(null);
                }}
                style={{
                  backgroundColor: "#f3f4f6", borderRadius: 20,
                  width: 32, height: 32, alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#c4451a" />
                <Text style={{ color: "#9ca3af", marginTop: 12 }}>
                  Loading requester details...
                </Text>
              </View>
            ) : requesterDetails ? (
              <>
                <View style={{
                  backgroundColor: "#fff7ed", borderRadius: 14,
                  padding: 16, marginBottom: 16,
                  borderWidth: 1, borderColor: "#fed7aa",
                }}>
                  <Text style={{
                    color: "#92400e", fontWeight: "700", fontSize: 13, marginBottom: 12,
                  }}>
                    REQUESTER INFORMATION
                  </Text>
                  <DetailRow label="Name" value={requesterDetails.name} />
                  <DetailRow label="Nickname" value={`@${requesterDetails.nickname}`} />
                  <DetailRow label="Email" value={requesterDetails.email} />
                  <DetailRow label="Phone" value={requesterDetails.phone || "Not provided"} />
                  <DetailRow label="Blood Group" value={requesterDetails.bloodGroup} last />
                </View>

                {selectedNotif?.body && (
                  <View style={{
                    backgroundColor: "#f8fafc", borderRadius: 12,
                    padding: 12, marginBottom: 16,
                    borderWidth: 1, borderColor: "#e2e8f0",
                  }}>
                    <Text style={{
                      color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 4,
                    }}>
                      REQUEST MESSAGE
                    </Text>
                    <Text style={{ color: "#374151", fontSize: 13, lineHeight: 18 }}>
                      {selectedNotif.body}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { setActionModal(false); setRejectModal(true); }}
                    style={{
                      flex: 1, backgroundColor: "#fef2f2",
                      borderRadius: 12, paddingVertical: 14,
                      alignItems: "center", borderWidth: 1, borderColor: "#fecaca",
                    }}
                  >
                    <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 13 }}>
                      ❌ Decline
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenChat}
                    style={{
                      flex: 2, backgroundColor: "#c4451a",
                      borderRadius: 12, paddingVertical: 14,
                      alignItems: "center", flexDirection: "row",
                      justifyContent: "center", gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💬</Text>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                      Open Chat
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ══ Reject Modal ══ */}
      <Modal
        visible={rejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 8 }}>
              Decline Request
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
              Optionally explain why you are declining this request.
            </Text>

            <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Reason (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 14, color: "#1f2937", minHeight: 80,
                textAlignVertical: "top", marginBottom: 20,
              }}
              placeholder="e.g. I am unable to donate at this time..."
              placeholderTextColor="#9ca3af"
              multiline
              value={rejectMessage}
              onChangeText={setRejectMessage}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setRejectModal(false)}
                style={{
                  flex: 1, backgroundColor: "#f3f4f6",
                  borderRadius: 12, paddingVertical: 14, alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectRequest}
                disabled={sendingReject}
                style={{
                  flex: 1, backgroundColor: "#dc2626",
                  borderRadius: 12, paddingVertical: 14, alignItems: "center",
                }}
              >
                {sendingReject ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Send Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Sidebar ── */}
      <Sidebar
        visible={sidebarVisible}
        sidebarAnim={sidebarAnim}
        nickname={nickname ?? undefined}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

    </View>
  );
}

const DetailRow = ({ label, value, last = false }: {
  label: string; value: string; last?: boolean;
}) => (
  <View style={{
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 7,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: "#fde68a",
  }}>
    <Text style={{ color: "#92400e", fontSize: 12, fontWeight: "600" }}>
      {label}
    </Text>
    <Text style={{
      color: "#1f2937", fontSize: 13, fontWeight: "600",
      maxWidth: "65%", textAlign: "right",
    }}>
      {value}
    </Text>
  </View>
);