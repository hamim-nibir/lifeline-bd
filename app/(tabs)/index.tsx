import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { logoutUser } from "../../services/auth";
import { StatusBar } from "expo-status-bar";
import Logo from "../../components/ui/logo";
import QuickEmergencyServices from "../../components/home/QuickEmergencyServices";
import SOSButtonCard from "../../components/home/SOSButtonCard";
import { getQuickEmergencyServices } from "../../services/emergencyServices";
import { QuickEmergencyService } from "../../types";

export default function HomeScreen() {
  const router = useRouter();
  const { nickname, accountType } = useAuthStore();
  const [services, setServices] = useState<QuickEmergencyService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      try {
        const data = await getQuickEmergencyServices();
        if (isMounted) {
          setServices(data);
        }
      } finally {
        if (isMounted) {
          setIsLoadingServices(false);
        }
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleServicePress = (service: QuickEmergencyService) => {
    if (service.route) {
      router.push(service.route as any);
      return;
    }

    Alert.alert(
      service.title,
      `${service.description}\n\nHotline: ${service.hotline}`,
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#f97316",
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        {/* Top row — logo + logout */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          {/* Logo — clickable → home */}
          <Logo onPress={() => router.push("/(tabs)")} />

          {/* Logout button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard title */}
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Welcome back, {nickname ?? "User"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Home
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

        {accountType !== "operator" && (
          <>
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <SOSButtonCard />
            </View>

            {isLoadingServices ? (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  paddingVertical: 28,
                  paddingHorizontal: 16,
                  marginTop: 8,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#f3f4f6",
                }}
              >
                <ActivityIndicator size="small" color="#f97316" />
                <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 10 }}>
                  Loading quick emergency services...
                </Text>
              </View>
            ) : (
              <QuickEmergencyServices
                services={services}
                onServicePress={handleServicePress}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}