import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { dispatchFireService } from "../../services/fireDispatch";

type FireServiceItem = {
  name: string;
  description: string;
};

const FIRE_SERVICES: FireServiceItem[] = [
  {
    name: "Rescue Service",
    description: "Professional rescue teams to evacuate trapped individuals.",
  },
  {
    name: "Industrial Fire Service",
    description: "Expertise in handling industrial fires and hazardous materials.",
  },
  {
    name: "High-Rise Fire Service",
    description: "Specialized equipment for high-rise building fires.",
  },
  {
    name: "Hazardous Materials Service",
    description: "Handling of hazardous materials and spills.",
  },
];

export default function FireServiceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleDispatch = async (service: string) => {
    try {
      const userId = user?.uid ?? "guest-user";
      const result = await dispatchFireService({ service, userId });
      Alert.alert("Dispatch Confirmed", `${service} dispatched successfully.`, [
        {
          text: "Track Live Status",
          onPress: () =>
            router.push({
              pathname: "/(feat)/fire-dispatch-tracking",
              params: { dispatchId: result.dispatchId, service },
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Dispatch Failed", error?.message ?? "Could not dispatch right now.");
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView className="flex-1 px-4 pt-14 pb-6" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-slate-500 font-semibold">← Back to Home</Text>
        </TouchableOpacity>

        <View className="bg-orange-700 rounded-2xl px-4 py-4 flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Fire Emergency</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("tel:999")}
            className="bg-white px-3 py-2 rounded-xl"
          >
            <Text className="text-orange-700 font-bold text-xs">Call Fire: 999</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-3">
          <Text className="text-center text-slate-900 text-2xl font-bold mb-1">Fire Services</Text>
          <Text className="text-center text-slate-400 text-xs mb-4">Choose the type of fire service you need</Text>

          <View className="gap-3">
            {FIRE_SERVICES.map((item) => (
              <View key={item.name} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <Text className="text-slate-900 font-bold text-base">{item.name}</Text>
                <Text className="text-slate-500 text-xs mt-1">{item.description}</Text>

                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/(feat)/fire-service-details", params: { service: item.name } })}
                    className="flex-1 border border-orange-700 rounded-lg py-2 items-center bg-white"
                  >
                    <Text className="text-orange-700 font-semibold text-xs">Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDispatch(item.name)}
                    className="flex-1 bg-orange-700 rounded-lg py-2 items-center"
                  >
                    <Text className="text-white font-bold text-xs">Dispatch Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
