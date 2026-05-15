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
import { useRef, useState } from "react";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48 - 1) / 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Feature = {
  icon: string;
  name: string;
  desc: string;
  route: string;
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
    route: "/(feat)/accident-report",
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
    icon: "🗺️",
    name: "Blood Banks",
    desc: "Nearby banks",
    route: "/(feat)/find-donor",
    color: "#fdf4ff",
  },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();

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

  const handleFeaturePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── AppHeader ── */}
      <AppHeader
        headerAnim={headerAnim}
        headerOpacity={headerOpacity}
        onOpenSidebar={openSidebar}
      />

      {/* ── Dashboard title section ── */}
      {/* <View style={{
        backgroundColor: "#c4451a",
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}> */}
        {/* <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Welcome back, {nickname ?? "User"}
        </Text> */}
        {/* <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Citizen Dashboard
        </Text> */}
      {/* </View> */}

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

      {/* ══ SIDEBAR ══ */}
      {sidebarVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
            onPress={closeSidebar}
            activeOpacity={1}
          />
          <Animated.View style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: SCREEN_WIDTH * 0.74,
            backgroundColor: "#aa411e39",
            transform: [{ translateX: sidebarAnim }],
            paddingTop: 62, paddingHorizontal: 22,
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 14,
            borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
          }}>
            <TouchableOpacity
              onPress={closeSidebar}
              style={{
                position: "absolute", top: 54, right: 18,
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: "#f5f5f5",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: "#959595" }}>✕</Text>
            </TouchableOpacity>

            {/* Profile area */}
            <View style={{
              alignItems: "center", marginBottom: 24,
              paddingBottom: 22, borderBottomWidth: 1.5, borderBottomColor: "#f0f0f0",
            }}>
              <View style={{
                width: 70, height: 70, borderRadius: 35,
                backgroundColor: "#fdf0eb",
                alignItems: "center", justifyContent: "center", marginBottom: 10,
                borderWidth: 2, borderColor: "#c4451a30",
                shadowColor: "#c4451a", shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
              }}>
                <Text style={{ fontSize: 30 }}>👤</Text>
              </View>
              <Text style={{ color: "#111", fontSize: 16, fontWeight: "800" }}>
                {nickname ?? "User"}
              </Text>
              <View style={{
                marginTop: 5, paddingHorizontal: 10, paddingVertical: 3,
                backgroundColor: "#f0fdf4", borderRadius: 20, borderWidth: 1, borderColor: "#bbf7d0",
              }}>
                <Text style={{ color: "#166534", fontSize: 11, fontWeight: "700" }}>LifeLine BD Member</Text>
              </View>
            </View>

            {[
              { icon: "👤", label: "Profile", bg: "#fdf0eb", onPress: () => { closeSidebar(); router.push("/(tabs)/profile" as any); } },
              { icon: "📋", label: "History", bg: "#f0f4ff", onPress: () => { closeSidebar(); router.push("/(feat)/history" as any); } },
              { icon: "💬", label: "Chat with Operator", onPress: () => { closeSidebar(); router.push("/(feat)/chat" as any); } },
            ].map((item, i) => (
              <TouchableOpacity
                key={i} onPress={item.onPress}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingVertical: 13, paddingHorizontal: 10,
                  borderRadius: 14, marginBottom: 4,
                  backgroundColor: "transparent",
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: item.bg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <Text style={{ color: "#faf7f7", fontSize: 15, fontWeight: "600" }}>{item.label}</Text>
                <Text style={{ color: "#ccc", marginLeft: "auto", fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 1.5, backgroundColor: "#f0f0f0", marginVertical: 14 }} />

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                paddingVertical: 13, paddingHorizontal: 10, borderRadius: 14,
                backgroundColor: "#fff5f5",
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: "#fee2e2",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 18 }}>🚪</Text>
              </View>
              <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "700" }}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

    </View>
  );
}