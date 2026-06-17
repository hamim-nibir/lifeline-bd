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

type PoliceReport = {
  id: string;
  reportedBy: string;
  type: string;
  description: string;
  location: { latitude: number; longitude: number; mapsLink: string };
  evidenceFiles: string[];
  voiceNoteUri: string | null;
  status: string;
  createdAt: any;
};

type PanicAlert = {
  id: string;
  nickname: string;
  latitude: number;
  longitude: number;
  mapsLink: string;
  activatedAt: any;
  active: boolean;
  status: string;
};

type SecurityRequest = {
  id: string;
  requestedBy: string;
  latitude: number;
  longitude: number;
  mapsLink: string;
  status: string;
  createdAt: any;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  reviewed: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  resolved: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  active:   { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
  assigned: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
};

export default function OperatorPoliceReportsScreen() {
  const router = useRouter();
  const [reports, setReports]       = useState<PoliceReport[]>([]);
  const [panics, setPanics]         = useState<PanicAlert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "panics" | "security">("panics");
  const [security, setSecurity]   = useState<SecurityRequest[]>([]);

  const fetchData = async () => {
    try {
      // Fetch police reports
      const rq = query(
        collection(db, "policeReports")
        //orderBy("createdAt", "desc")
      );
      const rSnap = await getDocs(rq);
      const reportList: PoliceReport[] = rSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PoliceReport, "id">),
      }));
      const sortedReports = reportList.sort((a, b) =>
        (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0)
      );
      setReports(sortedReports);
      //setReports(reportList);

      // Fetch panic alerts
      const pq = query(
        collection(db, "policeAlerts")
        //orderBy("activatedAt", "desc")
      );
      const pSnap = await getDocs(pq);
      const panicList: PanicAlert[] = pSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PanicAlert, "id">),
      }));
      const sortedPanics = panicList.sort((a, b) =>
        (b.activatedAt?.toDate?.() ?? 0) - (a.activatedAt?.toDate?.() ?? 0)
      );
      setPanics(sortedPanics);
      //setPanics(panicList);

      // Fetch security requests
      const sq = await getDocs(collection(db, "securityRequests"));
      const securityList: SecurityRequest[] = sq.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SecurityRequest, "id">) }))
        .sort((a, b) =>
          (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0)
        );
      setSecurity(securityList);

    } catch (err) {
      console.error("Failed to fetch police data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "policeReports", id), { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleResolvePanic = async (id: string) => {
    try {
      await updateDoc(doc(db, "policeAlerts", id), {
        active: false, status: "resolved",
      });
      setPanics((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: false, status: "resolved" } : p))
      );
    } catch (err) {
      console.error("Failed to resolve panic:", err);
    }
  };

  const handleSecurityStatus = async (id: string, newStatus: string) => {
  try {
    await updateDoc(doc(db, "securityRequests", id), { status: newStatus });
    setSecurity((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  } catch (err) {
    console.error("Failed to update security status:", err);
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
            Police Reports
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {reports.length} report(s) · {panics.filter(p => p.active).length} active panic(s)
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: "row", backgroundColor: "#fff",
        borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
      }}>
        {(["panics", "reports", "security"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 14, alignItems: "center",
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? "#c4451a" : "transparent",
            }}
          >
            <Text style={{
              fontWeight: "700", fontSize: 13,
              color: activeTab === tab ? "#c4451a" : "#9ca3af",
            }}>
              {tab === "panics"
                ? `🚨 Panics (${panics.filter(p => p.active).length})`
                : tab === "reports"
                ? `📋 Reports (${reports.length})`
                : `🔒 Security (${security.filter(s => s.status === "pending").length})`}
            </Text>
          </TouchableOpacity>
        ))}
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
          {/* ── Panic Alerts Tab ── */}
          {activeTab === "panics" && (
            panics.length === 0 ? (
              <View style={{
                backgroundColor: "#fff", borderRadius: 16, padding: 40,
                alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
              }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🛡️</Text>
                <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                  No panic alerts
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                  Active police panic alerts will appear here
                </Text>
              </View>
            ) : (
              panics.map((panic) => (
                <View key={panic.id} style={{
                  backgroundColor: panic.active ? "#fef2f2" : "#fff",
                  borderRadius: 16, marginBottom: 12, padding: 16,
                  borderWidth: 1,
                  borderColor: panic.active ? "#fca5a5" : "#f3f4f6",
                  elevation: 1,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 24, marginRight: 10 }}>
                      {panic.active ? "🚨" : "✅"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                        {panic.nickname}
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                        {formatTime(panic.activatedAt)}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: STATUS_COLORS[panic.status]?.bg ?? "#f3f4f6",
                      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: STATUS_COLORS[panic.status]?.border ?? "#e5e7eb",
                    }}>
                      <Text style={{
                        fontSize: 11, fontWeight: "700", textTransform: "capitalize",
                        color: STATUS_COLORS[panic.status]?.text ?? "#6b7280",
                      }}>
                        {panic.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>
                    📍 {panic.latitude?.toFixed(5)}, {panic.longitude?.toFixed(5)}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      //onPress={() => Linking.openURL(panic.mapsLink)}
                      onPress={() => {
                        const link = panic.mapsLink ??
                          `https://maps.google.com/?q=${panic.latitude},${panic.longitude}`;
                        Linking.openURL(link);
                      }}
                      style={{
                        flex: 1, backgroundColor: "#1a4a4a", borderRadius: 10,
                        paddingVertical: 10, alignItems: "center",
                        flexDirection: "row", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🗺️</Text>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                        Open in Maps
                      </Text>
                    </TouchableOpacity>
                    {panic.active && (
                      <TouchableOpacity
                        onPress={() => handleResolvePanic(panic.id)}
                        style={{
                          flex: 1, backgroundColor: "#f0fdf4", borderRadius: 10,
                          paddingVertical: 10, alignItems: "center",
                          borderWidth: 1, borderColor: "#86efac",
                        }}
                      >
                        <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 13 }}>
                          ✅ Resolve
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )
          )}

          {/* ── Reports Tab ── */}
          {activeTab === "reports" && (
            reports.length === 0 ? (
              <View style={{
                backgroundColor: "#fff", borderRadius: 16, padding: 40,
                alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
              }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
                <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                  No reports yet
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                  Submitted police reports will appear here
                </Text>
              </View>
            ) : (
              reports.map((report) => {
                const isExpanded = expandedId === report.id;
                const statusColor = STATUS_COLORS[report.status] ?? STATUS_COLORS.pending;
                return (
                  <View key={report.id} style={{
                    backgroundColor: "#fff", borderRadius: 16, marginBottom: 12,
                    borderWidth: 1, borderColor: "#f3f4f6",
                    overflow: "hidden", elevation: 1,
                  }}>
                    <TouchableOpacity
                      onPress={() => setExpandedId(isExpanded ? null : report.id)}
                      style={{ padding: 16 }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ fontSize: 20, marginRight: 10 }}>🚔</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                            {report.type?.replace(/_/g, " ").toUpperCase()}
                          </Text>
                          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                            By {report.reportedBy} · {formatTime(report.createdAt)}
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
                            {report.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#64748b", fontSize: 12 }} numberOfLines={2}>
                        {report.description}
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6, textAlign: "right" }}>
                        {isExpanded ? "▲ Collapse" : "▼ View Details"}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{
                        borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16,
                      }}>
                        {/* Description */}
                        <Text style={detailSectionTitle}>Description</Text>
                        <Text style={{ color: "#374151", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
                          {report.description}
                        </Text>

                        {/* Evidence files */}
                        {report.evidenceFiles?.length > 0 && (
                          <>
                            <Text style={detailSectionTitle}>
                              Evidence ({report.evidenceFiles.length} file(s))
                            </Text>
                            {report.evidenceFiles.map((f, i) => (
                              <Text key={i} style={{
                                fontSize: 12, color: "#374151", marginBottom: 4,
                              }} numberOfLines={1}>
                                📎 {f.split("/").pop()}
                              </Text>
                            ))}
                          </>
                        )}

                        {/* Voice note */}
                        {report.voiceNoteUri && (
                          <View style={{
                            backgroundColor: "#f0faf5", borderRadius: 8,
                            padding: 8, marginBottom: 12,
                            flexDirection: "row", alignItems: "center", gap: 6,
                          }}>
                            <Text style={{ fontSize: 16 }}>🎤</Text>
                            <Text style={{ fontSize: 12, color: "#1a7a4a", fontWeight: "600" }}>
                              Voice note attached
                            </Text>
                          </View>
                        )}

                        {/* Location */}
                        <Text style={detailSectionTitle}>Location</Text>
                        <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 8 }}>
                          {report.location?.latitude?.toFixed(6)}, {report.location?.longitude?.toFixed(6)}
                        </Text>

                        <TouchableOpacity
                          //onPress={() => Linking.openURL(report.location?.mapsLink)}
                          onPress={() => {
                            const link = report.location?.mapsLink ??
                              `https://maps.google.com/?q=${report.location?.latitude},${report.location?.longitude}`;
                            Linking.openURL(link);
                          }}
                          style={{
                            backgroundColor: "#1a4a4a", borderRadius: 10,
                            paddingVertical: 12, alignItems: "center",
                            flexDirection: "row", justifyContent: "center",
                            gap: 8, marginBottom: 12,
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>🗺️</Text>
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                            Open Location in Maps
                          </Text>
                        </TouchableOpacity>

                        {/* Status update */}
                        <Text style={[detailSectionTitle, { marginBottom: 8 }]}>
                          Update Status
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {["pending", "reviewed", "resolved"].map((s) => (
                            <TouchableOpacity
                              key={s}
                              onPress={() => handleStatusChange(report.id, s)}
                              style={{
                                flex: 1,
                                backgroundColor: report.status === s
                                  ? STATUS_COLORS[s].bg : "#f3f4f6",
                                borderRadius: 8, paddingVertical: 8,
                                alignItems: "center", borderWidth: 1,
                                borderColor: report.status === s
                                  ? STATUS_COLORS[s].border : "#e5e7eb",
                              }}
                            >
                              <Text style={{
                                fontSize: 12, fontWeight: "700",
                                textTransform: "capitalize",
                                color: report.status === s
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
            )
          )}
            {/* Security Requests Tab */}
          {activeTab === "security" && (
              security.length === 0 ? (
                <View style={{
                  backgroundColor: "#fff", borderRadius: 16, padding: 40,
                  alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
                }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
                  <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                    No security requests
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                    Protection guard requests will appear here
                  </Text>
                </View>
              ) : (
                security.map((req) => {
                  const statusColor = STATUS_COLORS[req.status] ?? STATUS_COLORS.pending;
                  return (
                    <View key={req.id} style={{
                      backgroundColor: "#fff", borderRadius: 16, marginBottom: 12,
                      borderWidth: 1,
                      borderColor: req.status === "pending" ? "#fed7aa" : "#f3f4f6",
                      padding: 16, elevation: 1,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ fontSize: 24, marginRight: 10 }}>🔒</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                            {req.requestedBy}
                          </Text>
                          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                            {formatTime(req.createdAt)}
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

                      <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>
                        📍 {req.latitude?.toFixed(5)}, {req.longitude?.toFixed(5)}
                      </Text>

                      <TouchableOpacity
                        onPress={() => {
                          const link = req.mapsLink ??
                            `https://maps.google.com/?q=${req.latitude},${req.longitude}`;
                          Linking.openURL(link);
                        }}
                        style={{
                          backgroundColor: "#1a4a4a", borderRadius: 10,
                          paddingVertical: 10, alignItems: "center",
                          flexDirection: "row", justifyContent: "center",
                          gap: 6, marginBottom: 10,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>🗺️</Text>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                          Open Location in Maps
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {["pending", "assigned", "resolved"].map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => handleSecurityStatus(req.id, s)}
                            style={{
                              flex: 1,
                              backgroundColor: req.status === s
                                ? STATUS_COLORS[s]?.bg ?? "#f3f4f6" : "#f3f4f6",
                              borderRadius: 8, paddingVertical: 8,
                              alignItems: "center", borderWidth: 1,
                              borderColor: req.status === s
                                ? STATUS_COLORS[s]?.border ?? "#e5e7eb" : "#e5e7eb",
                            }}
                          >
                            <Text style={{
                              fontSize: 11, fontWeight: "700",
                              textTransform: "capitalize",
                              color: req.status === s
                                ? STATUS_COLORS[s]?.text ?? "#6b7280" : "#6b7280",
                            }}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })
              )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const detailSectionTitle = {
  fontSize: 13, fontWeight: "700" as const,
  color: "#374151", marginBottom: 6,
};