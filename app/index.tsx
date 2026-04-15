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


const { height } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Top bar with Login button */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6 pt-14 pb-4">
        <View className="flex-row items-center gap-2">
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 40, height: 40, resizeMode: "contain" }}
          />
          <Text className="text-white text-2xl font-bold">Lifeline BD</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white px-5 py-2 rounded-full"
        >
          <Text className="text-orange-600 font-semibold text-sm">Login</Text>
        </TouchableOpacity>
      </View>

      {/* Hero section */}
      <View
        className="bg-orange-600 items-center justify-center px-8"
        style={{ height: height * 0.50 }}
      >
        <Text className="text-white text-4xl font-bold text-center leading-tight"
        style={{marginTop:50}}>
          Emergency Help
        </Text>
        <Text className="text-red-200 text-base text-center mt-4 leading-relaxed">
          Get instant help in critical situations.{"\n"} Our emergency services are available 24/7.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="bg-white mt-8 px-10 py-4 rounded-2xl"
        >
          <Text className="text-orange-600 font-bold text-base">
            Get Started
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats section */}
      <View className="flex-row mx-6 -mt-6">
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mr-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">5mins</Text>
          <Text className="text-gray-500 text-xs mt-1">Avg. Response</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">24/7</Text>
          <Text className="text-gray-500 text-xs mt-1">Coverage</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 items-center ml-2 shadow-sm border border-gray-100">
          <Text className="text-orange-600 text-2xl font-bold">500+</Text>
          <Text className="text-gray-500 text-xs mt-1">Active Volunteers</Text>
        </View>
      </View>

      {/* Features */}
      <ScrollView className="mx-6 mt-6" showsVerticalScrollIndicator={false}>
        {[
          {
            icon: "🚑",
            title: "Medical Emergency",
            desc: "Get medical help faster",
          },
          {
            icon: "🔥",
            title: "Fire Emergency",
            desc: "Report a fire quickly",
          },
          {
            icon: "👮",
            title: "Police Help",
            desc: "Contact the nearest police station",
          },
          {
            icon: "🌩️",
            title: "Natural Disaster",
            desc: "Request rescue assistance",
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
          className="bg-orange-600 rounded-2xl py-4 items-center mt-2 mb-10"
        >
          <Text className="text-white font-bold text-base">
            Create Free Account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}