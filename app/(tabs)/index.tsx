import { View, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <View className="bg-red-600 px-6 pt-16 pb-8">
        <Text className="text-white text-sm font-medium tracking-widest uppercase">
          Welcome to
        </Text>
        <Text className="text-white text-4xl font-bold mt-1">Lifeline BD</Text>
        <Text className="text-red-200 text-base mt-2">
          Connecting donors, saving lives
        </Text>
      </View>
    </ScrollView>
  );
}