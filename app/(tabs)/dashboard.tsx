import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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

const CITIZEN_FEATURES: Feature[] = [
  {
    icon: "🩸",
    name: "Donate",
    desc: "Register as donor",
    route: "/donate",
    color: "#fef2f2",
  },
  {
    icon: "🏥",
    name: "Request",
    desc: "Request blood",
    route: "/request-blood",
    color: "#fff7ed",
  },
  {
    icon: "🔍",
    name: "Find Donor",
    desc: "Search nearby",
    route: "/find-donor",
    color: "#f0fdf4",
  },
  {
    icon: "📋",
    name: "My History",
    desc: "Past donations",
    route: "/history",
    color: "#eff6ff",
  },
  {
    icon: "🗺️",
    name: "Blood Banks",
    desc: "Nearby banks",
    route: "/blood-banks",
    color: "#fdf4ff",
  },
  {
    icon: "🔔",
    name: "Alerts",
    desc: "Urgent needs",
    route: "/alerts",
    color: "#fff7ed",
  },
  {
    icon: "📞",
    name: "Emergency",
    desc: "Quick contact",
    route: "/emergency",
    color: "#fef2f2",
  },
  {
    icon: "📊",
    name: "Statistics",
    desc: "Blood data",
    route: "/statistics",
    color: "#f0fdf4",
  },
  {
    icon: "⚙️",
    name: "Settings",
    desc: "My account",
    route: "/settings",
    color: "#f8fafc",
  },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  const handleFeaturePress = (route: string) => {
    // placeholder — will navigate when pages are built
    console.log("Navigate to:", route);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#f97316",
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        {/* Top row — logo + logout */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          {/* Logo — clickable → home */}
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 22 }}>🩸</Text>
              <Text style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}>
                Lifeline BD
              </Text>
            </View>
          </TouchableOpacity>

          {/* Logout button */}
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
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard title */}
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Welcome back, {nickname ?? "User"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Citizen Dashboard
        </Text>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section label */}
        <Text style={{
          color: "#374151",
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
          marginTop: 4,
        }}>
          Features
        </Text>

        {/* 3x3 Feature grid */}
        <View style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}>
          {CITIZEN_FEATURES.map((feature, index) => (
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
              <Text style={{
                color: "#1f2937",
                fontSize: 12,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 3,
              }}>
                {feature.name}
              </Text>
              <Text style={{
                color: "#9ca3af",
                fontSize: 10,
                textAlign: "center",
                lineHeight: 14,
              }}>
                {feature.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming soon banner */}
        <View style={{
          backgroundColor: "#fff7ed",
          borderWidth: 1,
          borderColor: "#fed7aa",
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>🚧</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#9a3412", fontWeight: "700", fontSize: 13 }}>
              More features coming soon
            </Text>
            <Text style={{ color: "#c2410c", fontSize: 12, marginTop: 2 }}>
              New tools are being built for citizens
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}