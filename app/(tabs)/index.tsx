import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { logoutUser } from "../../services/auth";
import { StatusBar } from "expo-status-bar";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

import Logo from "../../components/ui/logo";

export default function HomeScreen() {
  const router = useRouter();
  const { nickname, accountType } = useAuthStore();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar style="light" />

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
              {t("common.logout")}
            </Text>
          </TouchableOpacity>
          <LanguageSwitcher />
        </View>

        {/* Dashboard title */}
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          {t("dashboard.welcomeBack", { name: nickname ?? t("common.userFallback") })}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          {t("dashboard.homeTitle")}
        </Text>
      </View>

      <View style={{ padding: 20 }}>
        {/* Welcome card */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#f3f4f6",
        }}>
          <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700" }}>
            {t("dashboard.welcomeBack", { name: nickname ?? t("common.userFallback") })} 👋
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
            You are logged in as{" "}
            <Text style={{ color: "#dc2626", fontWeight: "600", textTransform: "capitalize" }}>
              {accountType ?? "citizen"}
            </Text>
          </Text>
        </View>

        {/* Go to dashboard */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/dashboard")}
          style={{
            backgroundColor: "#f97316",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {t("dashboard.goToDashboard")}
          </Text>
        </TouchableOpacity>

        <View style={{
          backgroundColor: "#fef2f2",
          borderRadius: 16,
          padding: 16,
          marginTop: 8,
          alignItems: "center",
        }}>
          <Text style={{ color: "#9ca3af", fontSize: 13 }}>
            {t("dashboard.homeDesigning")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}