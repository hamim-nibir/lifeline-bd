import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

type UnifiedRequest = {
  id: string;
  requestedBy: string;
  services: string[];
  emergencyType: string;
  location: string;
  description: string;
  contactNumber: string;
  status: string;
  createdAt: any;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  responding: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  resolved:   { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
};

export default function OperatorUnifiedRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests]     = useState<UnifiedRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, "unifiedRequests"));
      const list: UnifiedRequest[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<UnifiedRequest, "id">) }))
        .sort((a, b) =>
          (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0)
        );
      setRequests(list);
    } catch (err) {
      console.error("Failed to fetch unified requests:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "unifiedRequests", id), { status: newStatus });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#1a4a4a", paddingTop: 56, paddingBottom: 20,
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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Unified Requests
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {requests.filter(r => r.status === "pending").length} pending request(s)
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1a4a4a" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              colors={["#1a4a4a"]}
            />
          }
        >
          {requests.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⚡</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No unified requests
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Unified emergency requests will appear here
              </Text>
            </View>
          ) : (
            requests.map((req) => {
              const isExpanded = expandedId === req.id;
              const statusColor = STATUS_COLORS[req.status] ?? STATUS_COLORS.pending;
              return (
                <View key={req.id} style={{
                  backgroundColor: "#fff", borderRadius: 16, marginBottom: 12,
                  borderWidth: 1,
                  borderColor: req.status === "pending" ? "#fed7aa" : "#f3f4f6",
                  overflow: "hidden", elevation: 1,
                }}>
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : req.id)}
                    style={{ padding: 16 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>⚡</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                          {req.emergencyType}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                          By {req.requestedBy} · {formatTime(req.createdAt)}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: statusColor.bg, borderRadius: 20,
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderWidth: 1, borderColor: statusColor.border,
                      }}>
                        <Text style={{
                          fontSize: 11, fontWeight: "700",
                          textTransform: "capitalize", color: statusColor.text,
                        }}>
                          {req.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: "#64748b", fontSize: 12 }} numberOfLines={1}>
                      🚑🔥🛡️ {req.services?.join(", ")}
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6, textAlign: "right" }}>
                      {isExpanded ? "▲ Collapse" : "▼ View Details"}
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{
                      borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16,
                    }}>
                      {/* Services */}
                      <Text style={sectionTitle}>Services Requested</Text>
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {req.services?.map((s) => (
                          <View key={s} style={{
                            backgroundColor: "#fdf0eb", borderRadius: 8,
                            paddingHorizontal: 10, paddingVertical: 4,
                            borderWidth: 1, borderColor: "#f0c4b0",
                          }}>
                            <Text style={{ fontSize: 12, color: "#c4451a", fontWeight: "600", textTransform: "capitalize" }}>
                              {s}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Description */}
                      <Text style={sectionTitle}>Description</Text>
                      <Text style={{ color: "#374151", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
                        {req.description}
                      </Text>

                      {/* Location */}
                      <Text style={sectionTitle}>Location</Text>
                      <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
                        📍 {req.location}
                      </Text>

                      {/* Contact */}
                      <Text style={sectionTitle}>Contact Number</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${req.contactNumber}`)}
                        style={{ marginBottom: 14 }}
                      >
                        <Text style={{ color: "#c4451a", fontSize: 13, fontWeight: "600" }}>
                          📞 {req.contactNumber}
                        </Text>
                      </TouchableOpacity>

                      {/* Status update */}
                      <Text style={[sectionTitle, { marginBottom: 8 }]}>Update Status</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {["pending", "responding", "resolved"].map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => handleStatusChange(req.id, s)}
                            style={{
                              flex: 1,
                              backgroundColor: req.status === s
                                ? STATUS_COLORS[s].bg : "#f3f4f6",
                              borderRadius: 8, paddingVertical: 8,
                              alignItems: "center", borderWidth: 1,
                              borderColor: req.status === s
                                ? STATUS_COLORS[s].border : "#e5e7eb",
                            }}
                          >
                            <Text style={{
                              fontSize: 11, fontWeight: "700",
                              textTransform: "capitalize",
                              color: req.status === s
                                ? STATUS_COLORS[s].text : "#6b7280",
                            }}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
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

const sectionTitle = {
  fontSize: 13, fontWeight: "700" as const,
  color: "#374151", marginBottom: 6,
};