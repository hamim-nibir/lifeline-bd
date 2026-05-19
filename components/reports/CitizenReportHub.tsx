import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { REPORT_TYPES, REPORT_CATEGORY_LABELS } from "../../constants/citizenReportConfig";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48 - 10) / 2;

type MyReport = {
  id: string;
  categoryLabel: string;
  status: string;
  createdAt: any;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#c2410c",
  forwarded: "#1d4ed8",
  rejected: "#dc2626",
};

export default function CitizenReportHub() {
  const router = useRouter();
  const { user } = useAuthStore();
  const uid = user?.uid ?? "";
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const loadMyReports = useCallback(async () => {
    if (!uid) return;
    setLoadingMine(true);
    try {
      const snap = await getDocs(query(
        collection(db, "citizenReports"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
      ));
      setMyReports(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          categoryLabel: data.categoryLabel ?? "Report",
          status: data.status ?? "pending",
          createdAt: data.createdAt,
        };
      }));
    } catch (e) {
      console.warn("Could not load my reports:", e);
    } finally {
      setLoadingMine(false);
    }
  }, [uid]);

  useFocusEffect(useCallback(() => {
    loadMyReports();
  }, [loadMyReports]));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loadingMine} onRefresh={loadMyReports} tintColor="#c4451a" />
      }
    >
      <View style={{
        backgroundColor: "#fff7ed",
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#fed7aa",
      }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#9a3412" }}>Submit a report</Text>
        <Text style={{ fontSize: 13, color: "#c2410c", marginTop: 6, lineHeight: 20 }}>
          Choose a category below. An operator will review your report and forward it to the right
          institutions (police, hospital, ambulance, fire service, or volunteers).
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {REPORT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.category}
            onPress={() =>
              router.push({
                pathname: "/(feat)/citizen-report-form",
                params: { category: type.category },
              } as any)
            }
            style={{
              width: CARD_W,
              backgroundColor: type.color,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1.5,
              borderColor: `${type.accent}30`,
              minHeight: 128,
            }}
            activeOpacity={0.82}
          >
            <Text style={{ fontSize: 30, marginBottom: 6 }}>{type.icon}</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#111" }}>{type.title}</Text>
            <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }} numberOfLines={2}>
              {type.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 10 }}>
          My submitted reports
        </Text>
        {loadingMine && myReports.length === 0 ? (
          <ActivityIndicator color="#c4451a" />
        ) : myReports.length === 0 ? (
          <Text style={{ color: "#9ca3af", fontSize: 13 }}>You have not submitted any reports yet.</Text>
        ) : (
          myReports.map((r) => (
            <View
              key={r.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#f3f4f6",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: "#111", fontSize: 14 }}>{r.categoryLabel}</Text>
                <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                  {r.createdAt?.toDate?.()?.toLocaleString?.() ?? "Submitted"}
                </Text>
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: "800",
                color: STATUS_COLOR[r.status] ?? "#6b7280",
                textTransform: "capitalize",
              }}>
                {r.status === "rejected" ? "discarded" : r.status}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
