import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { logoutUser } from "../../services/auth";
import { StatusBar } from "expo-status-bar";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import * as Location from "expo-location";

const QUICK_SERVICES = [
  { label: "Ambulance",       icon: "🚑", route: "/home/ambulance" },
  { label: "Police",          icon: "🛡️", route: "/home/police"   },
  { label: "Fire Service",    icon: "🔥", route: "/home/fire"      },
  { label: "Unified Service", icon: "⚡", route: "/home/Unified_Services" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { nickname, user } = useAuthStore();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const handleSOS = async () => {
    Alert.alert(
      "🚨 Send SOS Alert?",
      "This will immediately notify all operators and emergency contacts with your location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              let locationData = { latitude: 0, longitude: 0 };
              if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({});
                locationData = {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                };
              }
              await addDoc(collection(db, "sosAlerts"), {
                uid: user?.uid ?? "anonymous",
                name: nickname ?? "Unknown",
                location: locationData,
                status: "active",
                createdAt: serverTimestamp(),
              });
              Alert.alert("✅ SOS Sent", "Operators and emergency contacts have been notified with your location.");
            } catch (e) {
              Alert.alert("Error", "Could not send SOS. Please call 999 directly.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0eb" }}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={{
        backgroundColor: "#1a4a4a",
        paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{
            width: 34, height: 34, borderRadius: 9,
            backgroundColor: "#c4451a",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 16 }}>🛡️</Text>
          </View>
          <View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>অভয়</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>LifeLine BD</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL("tel:999")}
            style={{
              backgroundColor: "#c4451a", borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>📞 999</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={{
          backgroundColor: "#fff", borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: "#e8e4df", marginBottom: 22,
        }}>
          <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
            Welcome back, {nickname ?? "User"}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "900", color: "#c4451a", lineHeight: 34, marginBottom: 4 }}>
            অভয়
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>LifeLine BD</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
            <View style={{ width: 3, height: 18, backgroundColor: "#c4451a", borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Your Safety, Our Priority</Text>
          </View>
        </View>

        {/* Emergency Services */}
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 }}>
          Emergency Services
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {QUICK_SERVICES.map((s) => (
            <TouchableOpacity
              key={s.label}
              onPress={() => router.push(s.route as any)}
              style={{
                width: "47.5%", backgroundColor: "#fff",
                borderRadius: 14, borderWidth: 1, borderColor: "#e8e4df",
                paddingVertical: 18, alignItems: "center", gap: 8,
              }}
              activeOpacity={0.85}
            >
              <View style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: "#fdf0eb",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#1a1a1a" }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dashboard shortcut */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/dashboard")}
          style={{
            backgroundColor: "#1a4a4a", borderRadius: 14,
            paddingVertical: 14, alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
            Go to My Dashboard →
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SOS FAB — moved up so it doesn't overlap */}
      <TouchableOpacity
        onPress={handleSOS}
        style={{
          position: "absolute", bottom: 90, right: 16,
          width: 60, height: 60, borderRadius: 30,
          backgroundColor: "#c4451a",
          alignItems: "center", justifyContent: "center",
          shadowColor: "#c4451a", shadowOpacity: 0.5,
          shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 20 }}>🚨</Text>
        <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 }}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}