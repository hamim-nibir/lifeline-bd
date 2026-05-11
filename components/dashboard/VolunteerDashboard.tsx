import {
  View, Text, ScrollView,
  TouchableOpacity, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { logoutUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSwitcher from "../ui/LanguageSwitcher";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48 - 16) / 3;

type Feature = {
  icon: string;
  name: string;
  desc: string;
  route: string;
  color: string;
};

const VOLUNTEER_FEATURES: Feature[] = [
  { icon: "🩸", name: "Active Requests", desc: "Help needed now", route: "/(feat)/active-requests", color: "#fef2f2" },
  { icon: "🔔", name: "Alerts", desc: "Urgent cases", route: "/(feat)/alerts", color: "#fff7ed" },
  { icon: "🤝", name: "Assist Donor", desc: "Support donors", route: "/(feat)/assist-donor", color: "#f0fdf4" },
  { icon: "📅", name: "Schedule", desc: "My events", route: "/(feat)/schedule", color: "#eff6ff" },
  { icon: "🗺️", name: "Nearby Cases", desc: "Cases around me", route: "/(feat)/nearby-cases", color: "#fdf4ff" },
  { icon: "📋", name: "My Tasks", desc: "Assigned tasks", route: "/(feat)/my-tasks", color: "#f0fdf4" },
  { icon: "📊", name: "My Impact", desc: "Contributions", route: "/(feat)/my-impact", color: "#fff7ed" },
  { icon: "💬", name: "Messages", desc: "Inbox", route: "/(feat)/messages", color: "#f0fdf4" },
  { icon: "⚙️", name: "Settings", desc: "My account", route: "/(feat)/settings", color: "#f8fafc" },
];

export default function VolunteerDashboard() {
  const router = useRouter();
  const { nickname } = useAuthStore();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  const handleFeaturePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header — teal for volunteer */}
      <View style={{
        backgroundColor: "#0f766e",
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LanguageSwitcher />
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
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{t("common.logout")}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          {t("dashboard.welcomeBack", { name: nickname ?? t("banner.volunteer") })}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          {t("dashboard.volunteerTitle")}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 4 }}>
          {t("dashboard.yourTools")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {VOLUNTEER_FEATURES.map((feature, index) => (
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
          backgroundColor: "#f0fdfa",
          borderWidth: 1,
          borderColor: "#99f6e4",
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>🚧</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#134e4a", fontWeight: "700", fontSize: 13 }}>
              More volunteer tools coming soon
            </Text>
            <Text style={{ color: "#0f766e", fontSize: 12, marginTop: 2 }}>
              New features are being built for volunteers
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}