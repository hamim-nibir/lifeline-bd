import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import {
  collection, query, where,
  orderBy, getDocs,
} from "firebase/firestore";

type HistoryItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: any;
  collection: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  reviewed: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  resolved: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  active:   { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
};

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  policeReport:    { icon: "🚔", label: "Police Report",   color: "#1a4a4a" },
  accidentReport:  { icon: "🚨", label: "Accident Report", color: "#7c3aed" },
  disasterAlert:   { icon: "🌩️", label: "Disaster Alert",  color: "#5b21b6" },
  citizenReport:   { icon: "📋", label: "Citizen Report",    color: "#c4451a" },
  unifiedRequest:  { icon: "⚡", label: "Unified Request", color: "#c4451a" },
};

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const uid = user?.uid ?? "";

  const [items, setItems]         = useState<HistoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const allItems: HistoryItem[] = [];

      // Fetch police reports
      const pSnap = await getDocs(query(
        collection(db, "policeReports"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      pSnap.docs.forEach((d) => {
        const data = d.data();
        allItems.push({
          id: d.id,
          type: "policeReport",
          title: `Police Report — ${data.type?.replace(/_/g, " ")}`,
          status: data.status ?? "pending",
          createdAt: data.createdAt,
          collection: "policeReports",
        });
      });

      // Fetch accident reports
      const aSnap = await getDocs(query(
        collection(db, "accidentReports"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      aSnap.docs.forEach((d) => {
        const data = d.data();
        allItems.push({
          id: d.id,
          type: "accidentReport",
          title: `Accident Report — ${data.accidentType}`,
          status: data.status ?? "pending",
          createdAt: data.createdAt,
          collection: "accidentReports",
        });
      });

      // Fetch disaster alerts
      const dSnap = await getDocs(query(
        collection(db, "disasterAlerts"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      dSnap.docs.forEach((d) => {
        const data = d.data();
        allItems.push({
          id: d.id,
          type: "disasterAlert",
          title: `Disaster Alert — ${data.disasterType}`,
          status: data.status ?? "pending",
          createdAt: data.createdAt,
          collection: "disasterAlerts",
        });
      });

      // Fetch citizen reports (Report tab)
      const cSnap = await getDocs(query(
        collection(db, "citizenReports"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      cSnap.docs.forEach((d) => {
        const data = d.data();
        allItems.push({
          id: d.id,
          type: "citizenReport",
          title: `${data.categoryLabel ?? "Report"} — ${data.status ?? "pending"}`,
          status: data.status ?? "pending",
          createdAt: data.createdAt,
          collection: "citizenReports",
        });
      });

      // Fetch unified requests
      const uSnap = await getDocs(query(
        collection(db, "unifiedRequests"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      uSnap.docs.forEach((d) => {
        const data = d.data();
        allItems.push({
          id: d.id,
          type: "unifiedRequest",
          title: `Unified Request — ${data.emergencyType}`,
          status: data.status ?? "pending",
          createdAt: data.createdAt,
          collection: "unifiedRequests",
        });
      });

      // Sort all by date
      allItems.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bTime - aTime;
      });

      setItems(allItems);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

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
        backgroundColor: "#1a4a4a",
        paddingTop: 56, paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: "row", alignItems: "center", gap: 14,
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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>My History</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {items.length} submission{items.length !== 1 ? "s" : ""} total
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1a4a4a" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              colors={["#1a4a4a"]}
            />
          }
        >
          {items.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No history yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Your submitted reports and emergency requests will appear here
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const config = TYPE_CONFIG[item.type] ?? { icon: "📋", label: item.type, color: "#374151" };
              const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
              return (
                <View key={item.id} style={{
                  backgroundColor: "#fff", borderRadius: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: "#f3f4f6", padding: 14,
                  elevation: 1, shadowColor: "#000",
                  shadowOpacity: 0.04, shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: `${config.color}15`,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: "#1f2937", fontWeight: "700", fontSize: 13,
                      }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: statusColor.bg,
                      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1, borderColor: statusColor.border,
                    }}>
                      <Text style={{
                        fontSize: 11, fontWeight: "700",
                        textTransform: "capitalize",
                        color: statusColor.text,
                      }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}