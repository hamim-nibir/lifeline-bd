import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { logoutUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import AppHeader from "../../components/AppHeader";
import Sidebar from "../../components/ui/Sidebar";   // ✅ added
import { useRef, useState } from "react";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48 - 1) / 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Feature = {
  icon: string;
  name: string;
  desc: string;
  route: string;
  params?: Record<string, string>;
  color: string;
};

const CITIZEN_FEATURES: Feature[] = [
  {
    icon: "🔔",
    name: "Safety Panic Mode",
    desc: "Urgent response",
    route: "/(feat)/women-safety",
    color: "#fff7ed",
  },
  {
    icon: "⚠️",
    name: "Accident",
    desc: "Urgent report",
    route: "/(feat)/citizen-report-form",
    params: { category: "accident" },
    color: "#f0fdf4",
  },
  {
    icon: "📋",
    name: "Blood Donation History",
    desc: "Past donations",
    route: "/(feat)/blood-donation-history",
    color: "#eff6ff",
  },
  {
    icon: "🩸",
    name: "Blood Banks",
    desc: "Nearby banks",
    route: "/(feat)/find-donor",
    color: "#fdf4ff",
  },
  {
    icon: "🌩️",
    name: "Disaster Alert",
    desc: "Report disasters",
    route: "/(feat)/disaster-alert",
    color: "#ede9fe",
  },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();  // ✅ nickname already here

  // ── Hooks ──
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // ── Sidebar open/close ──
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  const handleLogout = async () => {
    closeSidebar();
    await logoutUser();
    router.replace("/login");
  };

  const handleFeaturePress = (feature: Feature) => {
    if (feature.params) {
      router.push({ pathname: feature.route, params: feature.params } as any);
    } else {
      router.push(feature.route as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── AppHeader ── */}
      <AppHeader
        headerAnim={headerAnim}
        headerOpacity={headerOpacity}
        onOpenSidebar={openSidebar}
      />

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
          Features
        </Text>

        {/* Feature grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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

      {/* ✅ Sidebar component — replaces all the inline sidebar code */}
      <Sidebar
        visible={sidebarVisible}
        sidebarAnim={sidebarAnim}
        nickname={nickname ?? undefined}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

    </View>
  );
}