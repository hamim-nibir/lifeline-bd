import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

const { height } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Top bar with Login button */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6 pt-14 pb-4">
        <Text className="text-white text-xl font-bold">🩸 Lifeline BD</Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white px-5 py-2 rounded-full"
        >
          <Text className="text-red-600 font-semibold text-sm">Login</Text>
        </TouchableOpacity>
      </View>

      {/* Hero section */}
      <View
        className="bg-red-600 items-center justify-center px-8"
        style={{ height: height * 0.55 }}
      >
        <Text className="text-white text-6xl mb-4">🩸</Text>
        <Text className="text-white text-4xl font-bold text-center leading-tight">
          Save Lives{"\n"}Donate Blood
        </Text>
        <Text className="text-red-200 text-base text-center mt-4 leading-relaxed">
          Connect with blood donors across{"\n"}Bangladesh instantly
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white mt-8 px-10 py-4 rounded-2xl"
        >
          <Text className="text-red-600 font-bold text-base">
            Get Started
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats section */}
      <View className="flex-row mx-6 -mt-6">
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mr-2 shadow-sm border border-gray-100">
          <Text className="text-red-600 text-2xl font-bold">1.2k+</Text>
          <Text className="text-gray-500 text-xs mt-1">Donors</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-2 shadow-sm border border-gray-100">
          <Text className="text-red-600 text-2xl font-bold">340+</Text>
          <Text className="text-gray-500 text-xs mt-1">Requests</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center ml-2 shadow-sm border border-gray-100">
          <Text className="text-red-600 text-2xl font-bold">8</Text>
          <Text className="text-gray-500 text-xs mt-1">Blood Types</Text>
        </View>
      </View>

      {/* Features */}
      <ScrollView className="mx-6 mt-6" showsVerticalScrollIndicator={false}>
        {[
          {
            icon: "🔍",
            title: "Find Donors Fast",
            desc: "Search donors by blood type and location instantly",
          },
          {
            icon: "🏥",
            title: "Request Blood",
            desc: "Post urgent requests and get responses quickly",
          },
          {
            icon: "🔔",
            title: "Real-time Alerts",
            desc: "Get notified when a matching donor is available",
          },
        ].map((feature, i) => (
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
          className="bg-red-600 rounded-2xl py-4 items-center mt-2 mb-10"
        >
          <Text className="text-white font-bold text-base">
            Create Free Account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}