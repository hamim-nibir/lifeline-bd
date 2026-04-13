import { View, Text } from "react-native";
import { useAuthStore } from "../../store/authStore";

const DASHBOARDS = {
  operator: {
    color: "bg-purple-600",
    emoji: "⚙️",
    title: "Operator Dashboard",
    subtitle: "Manage operations and users",
    features: ["User management", "Request oversight", "System reports", "Analytics"],
  },
  volunteer: {
    color: "bg-teal-600",
    emoji: "🤝",
    title: "Volunteer Dashboard",
    subtitle: "Support donors and patients",
    features: ["Active requests", "Donor assistance", "Event schedule", "My contributions"],
  },
  citizen: {
    color: "bg-red-600",
    emoji: "🩸",
    title: "Citizen Dashboard",
    subtitle: "Donate or request blood",
    features: ["Find donors", "Request blood", "My donations", "Nearby banks"],
  },
};

export default function HomeScreen() {
  const { accountType, nickname } = useAuthStore();
  const type = accountType ?? "citizen";
  const dashboard = DASHBOARDS[type];

  return (
    <View className="flex-1 bg-gray-50">
      <View className={`${dashboard.color} px-6 pt-16 pb-8`}>
        <Text className="text-white text-3xl">{dashboard.emoji}</Text>
        <Text className="text-white text-2xl font-bold mt-2">{dashboard.title}</Text>
        <Text className="text-white opacity-75 text-sm mt-1">{dashboard.subtitle}</Text>
      </View>

      <View className="px-4 mt-6">
        <Text className="text-gray-800 text-lg font-semibold mb-3">
          Features
        </Text>
        {dashboard.features.map((feature, i) => (
          <View key={i} className="bg-white rounded-2xl px-5 py-4 mb-3 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-gray-300 mr-3" />
            <Text className="text-gray-600">{feature}</Text>
            <Text className="ml-auto text-gray-300">→</Text>
          </View>
        ))}
        <View className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 mt-2">
          <Text className="text-yellow-700 text-sm font-medium">
            🚧 More features coming soon
          </Text>
        </View>
      </View>
    </View>
  );
}