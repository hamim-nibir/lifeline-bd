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
import Logo from "../../components/ui/logo";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48 - 1) / 3;

type Feature = {
  icon: string;
  nameKey: string;
  descKey: string;
  route: string;
  params?: Record<string, string>;
  color: string;
};

const CITIZEN_FEATURES: Feature[] = [
  {
    icon: "🔔",
    nameKey: "citizenDashboard.features.panic.name",
    descKey: "citizenDashboard.features.panic.desc",
    route: "/(feat)/women-safety",
    color: "#fff7ed",
  },
  {
    icon: "⚠️",
    nameKey: "citizenDashboard.features.accident.name",
    descKey: "citizenDashboard.features.accident.desc",
    route: "/(feat)/citizen-report-form",
    params: { category: "accident" },
    color: "#f0fdf4",
  },
  {
    icon: "🔍",
    name: "Find Donor",
    desc: "Search nearby",
    route: "/find-donor",
    color: "#f0fdf4",
  },
  {
    icon: "🤝",
    name: "Volunteer Network",
    desc: "Nearby responders",
    route: "/(feat)/volunteer-network",
    color: "#ecfeff",
  },
  {
    icon: "🧭",
    name: "Safe Route",
    desc: "Secure navigation",
    route: "/(feat)/safe-route-navigation",
    color: "#f0f9ff",
  },
  {
    icon: "🔔",
    name: "Notifications",
    desc: "Real-time updates",
    route: "/(tabs)/notifications",
    color: "#fff7ed",
  },
  {
    icon: "🩸",
    name: "Donate",
    desc: "Register as donor",
    route: "/donate",
    color: "#fef2f2",
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
  {
    icon: "📚",
    name: "Training",
    desc: "First aid & skills",
    route: "/(feat)/training-resources",
    color: "#eef2ff",
  },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const handleFeaturePress = (feature: (typeof features)[number]) => {
    if (feature.params) {
      router.push({ pathname: feature.route, params: feature.params } as any);
    } else {
      router.push(feature.route as any);
    }
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
          <Logo onPress={() => router.push("/(tabs)")} />

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
        <Text style={{
          color: "#374151",
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
          marginTop: 4,
        }}>
          {t("citizenDashboard.title")}
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
              onPress={() => handleFeaturePress(feature)}
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
