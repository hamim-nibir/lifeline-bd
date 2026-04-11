import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <StatusBar style="dark" />
      <Text className="text-red-600 text-3xl font-bold">Lifeline BD</Text>
      <Text className="text-gray-500 text-base mt-2">
        Hello World
      </Text>
    </View>
  );
}