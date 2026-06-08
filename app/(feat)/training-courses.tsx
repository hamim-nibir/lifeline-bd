import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function TrainingCoursesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 20 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 20, color: "#FF6B00" }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 28, marginBottom: 16 }}>🎬</Text>
          <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>
            Courses Disabled
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 }}>
            Training course content has been removed. This section is not available at the moment.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
