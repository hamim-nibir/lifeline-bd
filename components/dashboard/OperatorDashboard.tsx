import {
  View, Text, ScrollView,
  TouchableOpacity, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { logoutUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48 - 16) / 3;

type Feature = {
  icon: string;
  name: string;
  desc: string;
  route: string;
  color: string;
};

const OPERATOR_FEATURES: Feature[] = [
  { icon: "🚨", name: "Panic Alerts", desc: "View active alerts", route: "/(feat)/panic-alerts", color: "#fef2f2" },
  { icon: "📋", name: "Accident Reports", desc: "Review reports", route: "/(feat)/accident-reports", color: "#fff7ed" },
  { icon: "🩸", name: "Blood Requests", desc: "Manage requests", route: "/(feat)/blood-requests", color: "#fef2f2" },
  { icon: "👥", name: "User Management", desc: "Manage users", route: "/(feat)/user-management", color: "#eff6ff" },
  { icon: "🏥", name: "Blood Banks", desc: "Manage banks", route: "/(feat)/manage-banks", color: "#f0fdf4" },
  { icon: "📊", name: "Analytics", desc: "View statistics", route: "/(feat)/analytics", color: "#fdf4ff" },
  { icon: "📢", name: "Broadcast", desc: "Send alerts", route: "/(feat)/broadcast", color: "#fff7ed" },
  { icon: "🗺️", name: "Live Map", desc: "Track incidents", route: "/(feat)/live-map", color: "#f0fdf4" },
  { icon: "⚙️", name: "Settings", desc: "System config", route: "/(feat)/settings", color: "#f8fafc" },
];

export default function OperatorDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  const handleFeaturePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header — purple for operator */}
      <View style={{
        backgroundColor: "#7c3aed",
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 22 }}>🩸</Text>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
                Lifeline BD
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Welcome back, {nickname ?? "Operator"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Operator Dashboard
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 4 }}>
          Management Tools
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {OPERATOR_FEATURES.map((feature, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleFeaturePress(feature.route)}
              style={{
                width: CARD_SIZE,
                backgroundColor: feature.color,
                borderRadius: 16,
                padding: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#f3f4f6",
                minHeight: CARD_SIZE,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{feature.icon}</Text>
              <Text style={{ color: "#1f2937", fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 3 }}>
                {feature.name}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 10, textAlign: "center", lineHeight: 14 }}>
                {feature.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{
          backgroundColor: "#f5f3ff",
          borderWidth: 1,
          borderColor: "#ddd6fe",
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>🚧</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#5b21b6", fontWeight: "700", fontSize: 13 }}>
              More operator tools coming soon
            </Text>
            <Text style={{ color: "#7c3aed", fontSize: 12, marginTop: 2 }}>
              Advanced management features are being built
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}