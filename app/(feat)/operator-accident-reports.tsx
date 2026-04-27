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

type Report = {
  id: string;
  reportedBy: string;
  accidentType: string;
  vehicleInfo: { vehicleType: string; numVehicles: string; plateNumber: string } | null;
  injuryDetails: { numInjured: string; severeInjury: string; bleeding: string };
  sceneSafety: { roadBlocked: string; fireRisk: string };
  location: { latitude: number; longitude: number; address: string; mapsLink: string };
  status: string;
  createdAt: any;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  reviewed: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  resolved: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
};

export default function AccidentReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const q = query(
        collection(db, "accidentReports"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: Report[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Report, "id">),
      }));
      setReports(list);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "accidentReports", id), { status: newStatus });
      setReports((prev) =>
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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Accident Reports</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""} total
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReports(); }}
              colors={["#7c3aed"]}
            />
          }
        >
          {reports.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No reports yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Submitted accident reports will appear here
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
                  shadowColor: "#000", shadowOpacity: 0.04,
                  shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                }}>

                  {/* Report header row — always visible */}
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : report.id)}
                    style={{ padding: 16 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>🚨</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                          {report.accidentType}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                          By {report.reportedBy} • {formatTime(report.createdAt)}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: statusColor.bg, borderRadius: 20,
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderWidth: 1, borderColor: statusColor.border,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor.text, textTransform: "capitalize" }}>
                          {report.status}
                        </Text>
                      </View>
                    </View>

                    {/* Location preview */}
                    <Text style={{ color: "#64748b", fontSize: 12 }} numberOfLines={1}>
                      📍 {report.location?.address ?? "No location"}
                    </Text>

                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6, textAlign: "right" }}>
                      {isExpanded ? "▲ Collapse" : "▼ View Details"}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={{
                      borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16,
                    }}>

                      {/* Injury details */}
                      <Text style={detailSectionTitle}>Injury Details</Text>
                      <View style={detailRowStyle}>
                        <DetailItem label="Injured persons" value={report.injuryDetails?.numInjured} />
                        <DetailItem label="Severe injury" value={report.injuryDetails?.severeInjury} highlight={report.injuryDetails?.severeInjury === "Yes"} />
                      </View>
                      <View style={detailRowStyle}>
                        <DetailItem label="Bleeding / unconscious" value={report.injuryDetails?.bleeding} highlight={report.injuryDetails?.bleeding === "Yes"} />
                      </View>

                      {/* Scene safety */}
                      <Text style={[detailSectionTitle, { marginTop: 12 }]}>Scene Safety</Text>
                      <View style={detailRowStyle}>
                        <DetailItem label="Road blocked" value={report.sceneSafety?.roadBlocked} highlight={report.sceneSafety?.roadBlocked === "Yes"} />
                        <DetailItem label="Fire risk" value={report.sceneSafety?.fireRisk} highlight={report.sceneSafety?.fireRisk === "Yes"} />
                      </View>

                      {/* Vehicle info */}
                      {report.vehicleInfo && (
                        <>
                          <Text style={[detailSectionTitle, { marginTop: 12 }]}>Vehicle Info</Text>
                          <View style={detailRowStyle}>
                            <DetailItem label="Type" value={report.vehicleInfo.vehicleType || "—"} />
                            <DetailItem label="Count" value={report.vehicleInfo.numVehicles || "—"} />
                          </View>
                          {report.vehicleInfo.plateNumber ? (
                            <DetailItem label="Plate number" value={report.vehicleInfo.plateNumber} />
                          ) : null}
                        </>
                      )}

                      {/* Full location */}
                      <Text style={[detailSectionTitle, { marginTop: 12 }]}>Location</Text>
                      <View style={{
                        backgroundColor: "#f8fafc", borderRadius: 10,
                        padding: 12, marginBottom: 12,
                        borderWidth: 1, borderColor: "#e2e8f0",
                      }}>
                        <Text style={{ color: "#374151", fontSize: 13, lineHeight: 18 }}>
                          {report.location?.address}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
                          {report.location?.latitude?.toFixed(6)}, {report.location?.longitude?.toFixed(6)}
                        </Text>
                      </View>

                      {/* Map button */}
                      <TouchableOpacity
                        onPress={() => Linking.openURL(report.location?.mapsLink)}
                        style={{
                          backgroundColor: "#7c3aed", borderRadius: 10,
                          paddingVertical: 12, alignItems: "center",
                          flexDirection: "row", justifyContent: "center",
                          gap: 8, marginBottom: 12,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>🗺️</Text>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                          Open Live Location in Maps
                        </Text>
                      </TouchableOpacity>

                      {/* Status update */}
                      <Text style={[detailSectionTitle, { marginBottom: 8 }]}>Update Status</Text>
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
                              fontSize: 12, fontWeight: "700", textTransform: "capitalize",
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
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Small reusable detail item
const DetailItem = ({ label, value, highlight = false }: {
  label: string; value?: string; highlight?: boolean;
}) => (
  <View style={{ flex: 1, marginBottom: 8 }}>
    <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "600", marginBottom: 2 }}>
      {label.toUpperCase()}
    </Text>
    <Text style={{
      fontSize: 13, fontWeight: "600",
      color: highlight ? "#dc2626" : "#374151",
    }}>
      {value ?? "—"}
    </Text>
  </View>
);

const detailSectionTitle = {
  fontSize: 13, fontWeight: "700" as const,
  color: "#374151", marginBottom: 6,
};

const detailRowStyle = {
  flexDirection: "row" as const,
  gap: 12, marginBottom: 4,
};