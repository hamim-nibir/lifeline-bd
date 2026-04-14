import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  const router = useRouter();
  const { nickname, accountType } = useAuthStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={{
        backgroundColor: "#fc6a03",
        paddingTop: 56,
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: "center",
      }}>
        <Text style={{ fontSize: 40, marginBottom: 8 }}>🩸</Text>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", textAlign: "center" }}>
          Lifeline BD
        </Text>
        <Text style={{ color: "#fca5a5", fontSize: 14, marginTop: 6, textAlign: "center" }}>
          Connecting donors, saving lives
        </Text>
      </View>

      <View style={{ padding: 20 }}>
        {/* Welcome card */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#f3f4f6",
        }}>
          <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700" }}>
            Hello, {nickname ?? "User"} 👋
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
            You are logged in as{" "}
            <Text style={{ color: "#dc2626", fontWeight: "600", textTransform: "capitalize" }}>
              {accountType ?? "citizen"}
            </Text>
          </Text>
        </View>

        {/* Go to dashboard */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/dashboard")}
          style={{
            backgroundColor: "#f97316",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            Go to My Dashboard →
          </Text>
        </TouchableOpacity>

        <View style={{
          backgroundColor: "#fef2f2",
          borderRadius: 16,
          padding: 16,
          marginTop: 8,
          alignItems: "center",
        }}>
          <Text style={{ color: "#9ca3af", fontSize: 13 }}>
            🏗️ Home page is being designed
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}