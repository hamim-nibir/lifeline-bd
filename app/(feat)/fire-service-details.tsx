import { Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function FireServiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const serviceName = params.service ?? "Fire Service";

  return (
    <View className="flex-1 bg-slate-100 px-4 pt-14">
      <TouchableOpacity onPress={() => router.back()} className="mb-4">
        <Text className="text-slate-500 font-semibold">← Back</Text>
      </TouchableOpacity>

      <View className="bg-white border border-slate-200 rounded-2xl p-5">
        <Text className="text-slate-900 text-2xl font-bold">{serviceName}</Text>
        <Text className="text-slate-500 mt-3 text-sm leading-6">
          This is a placeholder details screen for {serviceName}. You can add service procedures, response times, equipment info, and preparation checklist here.
        </Text>
      </View>
    </View>
  );
}
