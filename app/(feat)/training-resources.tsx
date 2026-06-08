import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function TrainingResourcesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 20, color: "#FF6B00" }}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            marginTop: 40,
          }}
        >
          <Text style={{ fontSize: 32, marginBottom: 14 }}>📚</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" }}>
            Training is temporarily disabled
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 }}>
            The training feature is currently unavailable. Please check back later.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
