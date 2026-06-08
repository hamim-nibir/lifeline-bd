import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import Logo from "../components/ui/logo";
import { useTranslation } from "../hooks/useTranslation";


const { height } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Top bar with Login button */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6 pt-14 pb-4">
        <Logo onPress={() => router.push("/")} />
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white px-5 py-2 rounded-full"
        >
          <Text className="text-orange-600 font-semibold text-sm">{t("landing.login")}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero section */}
      <View
        className="items-center justify-center px-8"
        style={{
          height: height * 0.50,
          backgroundColor: "#c4451a", shadowColor: "#c4451a", shadowOpacity: 0.45, shadowRadius: 6, elevation: 4,
        }}
      >
        <Text className="text-white text-4xl font-bold text-center leading-tight"
          style={{ marginTop: 50 }}>
          {t("landing.heroTitle")}
        </Text>
        <Text className="text-red-200 text-base text-center mt-4 leading-relaxed">
          {t("landing.heroSubtitle")}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white mt-8 px-10 py-4 rounded-2xl"
        >
          <Text className="text-orange-600 font-bold text-base">
            {t("landing.getStarted")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats section */}
      <View className="flex-row mx-6 -mt-6">
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mr-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">5mins</Text>
          <Text className="text-gray-500 text-xs mt-1">{t("landing.avgResponse")}</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">24/7</Text>
          <Text className="text-gray-500 text-xs mt-1">{t("landing.coverage")}</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center ml-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">500+</Text>
          <Text className="text-gray-500 text-xs mt-1">{t("landing.volunteers")}</Text>
        </View>
      </View>

      {/* Features */}
      <ScrollView className="mx-6 mt-6" showsVerticalScrollIndicator={false}>
        {([
          { icon: "🚑", title: t("landing.features.medical.title"), desc: t("landing.features.medical.desc") },
          { icon: "🔥", title: t("landing.features.fire.title"), desc: t("landing.features.fire.desc") },
          { icon: "👮", title: t("landing.features.police.title"), desc: t("landing.features.police.desc") },
          { icon: "🌩️", title: t("landing.features.disaster.title"), desc: t("landing.features.disaster.desc") },
          { icon: "🔔", title: t("landing.features.alerts.title"), desc: t("landing.features.alerts.desc") },
        ] as const).map((feature, i) => (
          <View
            key={i}
            className="flex-row items-center bg-gray-50 rounded-2xl p-4 mb-3"
          >
            <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-2xl">{feature.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">{feature.title}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">{feature.desc}</Text>
            </View>
          </View>
        ))}

        {/* Register CTA */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-orange-600 rounded-2xl py-4 items-center mt-2 mb-10"
        >
          <Text className="text-white font-bold text-base">
            {t("landing.createAccount")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}