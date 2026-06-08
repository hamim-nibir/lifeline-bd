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

type DisasterReport = {
  id: string;
  uid: string;
  reportedBy: string;
  disasterType: string;
  urgency: string;
  peopleAffected: string | null;
  description: string;
  contactNumber: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    mapsLink: string;
  };
  status: string;
  createdAt: any;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  reviewed: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  resolved: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
};

export default function OperatorDisasterReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, "disasterAlerts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: DisasterReport[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DisasterReport, "id">),
      }));
      setReports(list);
    } catch (err) {
      console.error("Failed to fetch disaster reports:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "disasterAlerts", id), { status: newStatus });
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
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{
        backgroundColor: "#7c3aed",
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}>
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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Disaster Reports</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {reports.length} citizen report{reports.length !== 1 ? "s" : ""}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReports();
              }}
              colors={["#7c3aed"]}
            />
          }
        >
          {reports.length === 0 ? (
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 40,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🌩️</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No disaster reports yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Citizen disaster reports from the app will appear here
              </Text>
            </View>
          ) : (
            reports.map((report) => {
              const isExpanded = expandedId === report.id;
              const statusColor = STATUS_COLORS[report.status] ?? STATUS_COLORS.pending;

              return (
                <View
                  key={report.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#f3f4f6",
                    overflow: "hidden",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : report.id)}
                    style={{ padding: 16 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 20, marginRight: 10 }}>🌩️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                          {report.disasterType} · {report.urgency}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                          By {report.reportedBy} • {formatTime(report.createdAt)}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: statusColor.bg,
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: statusColor.border,
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: statusColor.text,
                          textTransform: "capitalize",
                        }}>
                          {report.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: "#64748b", fontSize: 12 }} numberOfLines={1}>
                      📍 {report.location?.address ?? "No location"}
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6, textAlign: "right" }}>
                      {isExpanded ? "▲ Collapse" : "▼ View Details"}
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16 }}>
                      <Text style={sectionLabel}>Description</Text>
                      <Text style={sectionValue}>{report.description}</Text>

                      <Text style={[sectionLabel, { marginTop: 12 }]}>Contact</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${report.contactNumber}`)}>
                        <Text style={{ color: "#7c3aed", fontWeight: "700", fontSize: 14 }}>
                          📞 {report.contactNumber}
                        </Text>
                      </TouchableOpacity>

                      {report.peopleAffected && (
                        <>
                          <Text style={[sectionLabel, { marginTop: 12 }]}>People affected</Text>
                          <Text style={sectionValue}>{report.peopleAffected}</Text>
                        </>
                      )}

                      <Text style={[sectionLabel, { marginTop: 12 }]}>Location</Text>
                      <Text style={sectionValue}>{report.location?.address}</Text>

                      <TouchableOpacity
                        onPress={() => report.location?.mapsLink && Linking.openURL(report.location.mapsLink)}
                        style={{
                          backgroundColor: "#7c3aed",
                          borderRadius: 10,
                          paddingVertical: 12,
                          alignItems: "center",
                          marginTop: 12,
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>🗺️ Open in Maps</Text>
                      </TouchableOpacity>

                      <Text style={[sectionLabel, { marginBottom: 8 }]}>Update status</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {["pending", "reviewed", "resolved"].map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => handleStatusChange(report.id, s)}
                            style={{
                              flex: 1,
                              backgroundColor: report.status === s ? STATUS_COLORS[s].bg : "#f3f4f6",
                              borderRadius: 8,
                              paddingVertical: 8,
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: report.status === s ? STATUS_COLORS[s].border : "#e5e7eb",
                            }}
                          >
                            <Text style={{
                              fontSize: 12,
                              fontWeight: "700",
                              textTransform: "capitalize",
                              color: report.status === s ? STATUS_COLORS[s].text : "#6b7280",
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

const sectionLabel = {
  fontSize: 11,
  fontWeight: "700" as const,
  color: "#9ca3af",
  marginBottom: 4,
};
const sectionValue = {
  fontSize: 13,
  color: "#374151",
  lineHeight: 20,
};
