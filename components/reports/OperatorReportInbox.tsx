import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl, Modal,
  TextInput, Alert, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useAuthStore } from "../../store/authStore";
import {
  FORWARD_OFFICES,
  REPORT_CATEGORY_LABELS,
  getReportConfig,
  type ForwardOfficeId,
  type ReportCategory,
} from "../../constants/citizenReportConfig";
import { forwardCitizenReport, rejectCitizenReport } from "../../services/citizenReportService";
import type { StoredEvidenceFile } from "../../services/reportEvidenceUpload";

const ACCENT = "#c4451a";

type CitizenReport = {
  id: string;
  category: ReportCategory;
  categoryLabel: string;
  reportedBy: string;
  contactNumber: string;
  details: Record<string, string>;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    mapsLink: string;
  };
  attachments?: StoredEvidenceFile[];
  status: string;
  forwardedTo?: { officeLabel: string }[];
  rejectReason?: string | null;
  createdAt: any;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  forwarded: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  rejected: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
};

const CATEGORY_ICON: Record<string, string> = {
  crime: "🚔", accident: "🚨", fire: "🔥", harassment: "⚠️", medical: "🏥", missing_person: "🔍",
};

const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#f3f4f6",
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

type Props = {
  /** Tab mode: content only (AppHeader provided by parent). */
  embedded?: boolean;
  /** Stack screen from Services: show back header. */
  showBackButton?: boolean;
};

export default function OperatorReportInbox({ embedded = false, showBackButton = false }: Props) {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const operatorUid = user?.uid ?? "";
  const operatorName = nickname ?? "Operator";

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const [forwardModal, setForwardModal] = useState(false);
  const [discardModal, setDiscardModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [selectedOffices, setSelectedOffices] = useState<Set<ForwardOfficeId>>(new Set());
  const [discardReason, setDiscardReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, "citizenReports"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CitizenReport, "id">),
      })));
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const filtered = reports.filter((r) => filter === "all" || r.status === "pending");

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "Just now";
    return ts.toDate().toLocaleString("en-BD", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const openForward = (report: CitizenReport) => {
    const cfg = getReportConfig(report.category);
    setSelectedOffices(new Set(cfg?.suggestedOffices ?? ["police"]));
    setSelectedReport(report);
    setForwardModal(true);
  };

  const toggleOffice = (id: ForwardOfficeId) => {
    setSelectedOffices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (!selectedReport) return;
    if (selectedOffices.size === 0) {
      Alert.alert("Select institutions", "Pick at least one institution to forward this report to.");
      return;
    }
    setActionLoading(true);
    try {
      const offices = FORWARD_OFFICES.filter((o) => selectedOffices.has(o.id));
      await forwardCitizenReport(
        selectedReport.id,
        offices.map((o) => ({ id: o.id, label: o.label })),
        operatorUid,
        operatorName,
        selectedReport.categoryLabel
      );
      setForwardModal(false);
      setSelectedReport(null);
      Alert.alert(
        "Forwarded",
        `Report sent to: ${offices.map((o) => o.label).join(", ")}.`
      );
      fetchReports();
    } catch {
      Alert.alert("Error", "Could not forward report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!selectedReport) return;
    if (!discardReason.trim()) {
      Alert.alert("Required", "Please enter a reason for discarding this report.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectCitizenReport(
        selectedReport.id,
        operatorUid,
        operatorName,
        discardReason.trim()
      );
      setDiscardModal(false);
      setDiscardReason("");
      setSelectedReport(null);
      Alert.alert("Discarded", "Report has been discarded and will not be forwarded.");
      fetchReports();
    } catch {
      Alert.alert("Error", "Could not discard report.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderAttachments = (attachments?: StoredEvidenceFile[]) => {
    if (!attachments?.length) {
      return <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>No files attached</Text>;
    }
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}>
          📎 Evidence ({attachments.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {attachments.map((a, i) => (
            <TouchableOpacity
              key={`${a.url}-${i}`}
              onPress={() => Linking.openURL(a.url)}
              style={{
                marginRight: 10,
                width: 100,
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                backgroundColor: "#f9fafb",
              }}
            >
              {a.kind === "image" ? (
                <Image source={{ uri: a.url }} style={{ width: 100, height: 80 }} resizeMode="cover" />
              ) : (
                <View style={{
                  width: 100, height: 80, backgroundColor: "#fff7ed",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>{a.kind === "video" ? "🎬" : "📄"}</Text>
                </View>
              )}
              <Text style={{ fontSize: 9, padding: 6, color: "#6b7280" }} numberOfLines={2}>
                {a.fileName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>Tap to open attachment</Text>
      </View>
    );
  };

  const renderDetails = (report: CitizenReport) => {
    const cfg = getReportConfig(report.category);
    return cfg?.fields.map((f) => {
      const v = report.details?.[f.key];
      if (!v?.trim()) return null;
      return (
        <View key={f.key} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>{f.label.toUpperCase()}</Text>
          <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>{v}</Text>
        </View>
      );
    });
  };

  const StatsAndIntro = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: embedded ? 12 : 0, paddingBottom: 8 }}>
      {embedded && (
        <>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111" }}>Report review queue</Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 12, lineHeight: 20 }}>
            Review citizen submissions, then forward to institutions or discard.
          </Text>
        </>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[cardStyle, { flex: 1, padding: 14 }]}>
          <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "600" }}>AWAITING REVIEW</Text>
          <Text style={{ color: ACCENT, fontSize: 28, fontWeight: "800" }}>{pendingCount}</Text>
        </View>
        <View style={[cardStyle, { flex: 1, padding: 14 }]}>
          <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "600" }}>TOTAL REPORTS</Text>
          <Text style={{ color: "#111", fontSize: 28, fontWeight: "800" }}>{reports.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {showBackButton && (
        <View style={{
          backgroundColor: ACCENT,
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
              width: 36, height: 36, borderRadius: 18,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Citizen Reports</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
              {pendingCount} pending · {reports.length} total
            </Text>
          </View>
        </View>
      )}

      <StatsAndIntro />

      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        {(["pending", "all"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: filter === f ? ACCENT : "#fff",
              borderWidth: 1,
              borderColor: filter === f ? ACCENT : "#e5e7eb",
              alignItems: "center",
            }}
          >
            <Text style={{
              fontWeight: "700", fontSize: 13,
              color: filter === f ? "#fff" : "#374151",
            }}>
              {f === "pending" ? `Pending (${pendingCount})` : `All (${reports.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReports(); }}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={[cardStyle, { padding: 40, alignItems: "center" }]}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>No reports in this queue</Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                New citizen reports will appear here for review
              </Text>
            </View>
          ) : (
            filtered.map((report) => {
              const st = STATUS_STYLE[report.status] ?? STATUS_STYLE.pending;
              const expanded = expandedId === report.id;

              return (
                <View key={report.id} style={[cardStyle, { marginBottom: 12, overflow: "hidden" }]}>
                  <TouchableOpacity
                    onPress={() => setExpandedId(expanded ? null : report.id)}
                    style={{ padding: 16 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <Text style={{ fontSize: 22 }}>{CATEGORY_ICON[report.category] ?? "📋"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 15 }}>
                          {report.categoryLabel || REPORT_CATEGORY_LABELS[report.category]}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                          {report.reportedBy} · {formatTime(report.createdAt)}
                        </Text>
                        <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                          📍 {report.location?.address}
                        </Text>
                        {(report.attachments?.length ?? 0) > 0 && (
                          <Text style={{ color: ACCENT, fontSize: 11, marginTop: 4, fontWeight: "600" }}>
                            📎 {report.attachments!.length} attachment(s)
                          </Text>
                        )}
                      </View>
                      <View style={{
                        backgroundColor: st.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: st.border,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: st.text, textTransform: "capitalize" }}>
                          {report.status === "rejected" ? "discarded" : report.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 8, textAlign: "right" }}>
                      {expanded ? "▲ Collapse" : "▼ View details"}
                    </Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16 }}>
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${report.contactNumber}`)}>
                        <Text style={{ color: ACCENT, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>
                          📞 {report.contactNumber}
                        </Text>
                      </TouchableOpacity>

                      {renderDetails(report)}
                      {renderAttachments(report.attachments)}

                      <TouchableOpacity
                        onPress={() => report.location?.mapsLink && Linking.openURL(report.location.mapsLink)}
                        style={{
                          marginTop: 12,
                          backgroundColor: "#f9fafb",
                          borderRadius: 12,
                          padding: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#e5e7eb",
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: "#374151", fontSize: 14 }}>
                          🗺️ Open location in Maps
                        </Text>
                      </TouchableOpacity>

                      {report.forwardedTo && report.forwardedTo.length > 0 && (
                        <View style={{
                          marginTop: 12, backgroundColor: "#eff6ff",
                          padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe",
                        }}>
                          <Text style={{ color: "#1d4ed8", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
                            Forwarded to:
                          </Text>
                          {report.forwardedTo.map((f, i) => (
                            <Text key={i} style={{ color: "#374151", fontSize: 13 }}>• {f.officeLabel}</Text>
                          ))}
                        </View>
                      )}

                      {report.status === "rejected" && report.rejectReason && (
                        <View style={{
                          marginTop: 12, backgroundColor: "#fef2f2",
                          padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca",
                        }}>
                          <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 13 }}>
                            Discarded: {report.rejectReason}
                          </Text>
                        </View>
                      )}

                      {report.status === "pending" && (
                        <View style={{ marginTop: 14, gap: 10 }}>
                          <Text style={{ color: "#6b7280", fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                            Select institutions to forward (uncheck any you want to exclude)
                          </Text>
                          <TouchableOpacity
                            onPress={() => openForward(report)}
                            style={{
                              backgroundColor: ACCENT,
                              borderRadius: 12,
                              paddingVertical: 14,
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                              📤 Forward to selected institutions
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedReport(report);
                              setDiscardReason("");
                              setDiscardModal(true);
                            }}
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: "#fecaca",
                            }}
                          >
                            <Text style={{ color: "#dc2626", fontWeight: "700" }}>Discard report</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={forwardModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: "85%",
          }}>
            <View style={{ width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111" }}>Forward to institutions</Text>
            <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 6, marginBottom: 16, lineHeight: 20 }}>
              Select all that apply (e.g. accident → Police + Ambulance + Hospital).
              Unchecked institutions will not receive this report.
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {FORWARD_OFFICES.map((office) => {
                const on = selectedOffices.has(office.id);
                return (
                  <TouchableOpacity
                    key={office.id}
                    onPress={() => toggleOffice(office.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      marginBottom: 8,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: on ? ACCENT : "#e5e7eb",
                      backgroundColor: on ? "#fff7ed" : "#fff",
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{office.icon}</Text>
                    <Text style={{ flex: 1, fontWeight: "700", color: "#111", fontSize: 15 }}>{office.label}</Text>
                    <Text style={{ fontSize: 18, color: on ? ACCENT : "#d1d5db" }}>{on ? "✓" : "○"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setForwardModal(false)}
                style={{ flex: 1, padding: 14, alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 12 }}
              >
                <Text style={{ fontWeight: "700", color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForward}
                disabled={actionLoading}
                style={{ flex: 2, padding: 14, alignItems: "center", backgroundColor: ACCENT, borderRadius: 12 }}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Forward ({selectedOffices.size})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={discardModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={[cardStyle, { padding: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111" }}>Discard report</Text>
            <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 8, marginBottom: 14, lineHeight: 20 }}>
              This report will not be forwarded. Please provide a reason.
            </Text>
            <TextInput
              style={{
                borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
                padding: 12, minHeight: 88, textAlignVertical: "top",
                fontSize: 14, color: "#1f2937", backgroundColor: "#f9fafb",
              }}
              multiline
              placeholder="Reason for discarding..."
              placeholderTextColor="#9ca3af"
              value={discardReason}
              onChangeText={setDiscardReason}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setDiscardModal(false)}
                style={{ flex: 1, padding: 12, alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 10 }}
              >
                <Text style={{ fontWeight: "700", color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDiscard}
                disabled={actionLoading}
                style={{ flex: 1, padding: 12, alignItems: "center", backgroundColor: "#dc2626", borderRadius: 10 }}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Discard</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
