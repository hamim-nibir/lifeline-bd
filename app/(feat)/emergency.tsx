import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function EmergencyScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#dc2626",
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>{t("emergency.title")}</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{t("emergency.subtitle")}</Text>
        </View>
        <View style={{ marginLeft: "auto" }}>
          <LanguageSwitcher />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#fee2e2",
            padding: 16,
            marginTop: 8,
          }}
        >
          <Text style={{ color: "#991b1b", fontWeight: "700", fontSize: 16 }}>
            {t("emergency.emptyTitle")}
          </Text>
          <Text style={{ color: "#b91c1c", fontSize: 13, marginTop: 6 }}>
            {t("emergency.emptyDesc")}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: "#fef2f2",
              borderColor: "#fecaca",
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#b91c1c", fontWeight: "700" }}>{t("common.home")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
