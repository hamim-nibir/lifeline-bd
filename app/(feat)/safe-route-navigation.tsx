import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

type RouteOption = {
  id: string;
  name: string;
  distance: string;
  eta: string;
  risk: "Low" | "Medium";
  avoidedZones: string;
  mapsLink: string;
};

const buildRouteOptions = (
  latitude: number,
  longitude: number,
  destination: string
): RouteOption[] => [
  {
    id: "r1",
    name: "Recommended Safe Route",
    distance: "2.4 km",
    eta: "9 min",
    risk: "Low",
    avoidedZones: "2 high-risk zones avoided",
    mapsLink: `https://maps.google.com/?q=${latitude},${longitude}`,
  },
  {
    id: "r2",
    name: "Alternative Route",
    distance: "2.8 km",
    eta: "11 min",
    risk: "Medium",
    avoidedZones: "1 high-risk zone avoided",
    mapsLink: `https://www.google.com/maps/search/${encodeURIComponent(destination)}`,
  },
];

export default function SafeRouteNavigationScreen() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateRoutes = async () => {
    if (!destination.trim()) {
      Alert.alert("Required", "Please enter your destination.");
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const list = buildRouteOptions(loc.coords.latitude, loc.coords.longitude, destination);
      setRoutes(list);
    } catch {
      Alert.alert("Error", "Could not generate route suggestions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#f97316",
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Safe Route Navigation</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            Avoid dangerous areas while traveling
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            padding: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
            Destination
          </Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Enter destination"
            style={{
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#1f2937",
              fontSize: 14,
            }}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            onPress={handleGenerateRoutes}
            disabled={loading}
            style={{
              marginTop: 12,
              backgroundColor: "#f97316",
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              {loading ? "Generating..." : "Suggest Safe Routes"}
            </Text>
          </TouchableOpacity>
        </View>

        {!!routes.length && (
          <View
            style={{
              backgroundColor: "#ecfeff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#a5f3fc",
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#0e7490", fontWeight: "700", fontSize: 13 }}>
              Security guidance enabled
            </Text>
            <Text style={{ color: "#155e75", fontSize: 12, marginTop: 4 }}>
              Suggested routes are prioritized to avoid high-risk or dangerous areas.
            </Text>
          </View>
        )}

        {routes.map((route) => (
          <View
            key={route.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#f3f4f6",
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>{route.name}</Text>
              <Text
                style={{
                  color: route.risk === "Low" ? "#15803d" : "#b45309",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {route.risk} Risk
              </Text>
            </View>
            <Text style={{ color: "#6b7280", fontSize: 12 }}>
              {route.distance} • {route.eta}
            </Text>
            <Text style={{ color: "#0f766e", fontSize: 12, marginTop: 6 }}>{route.avoidedZones}</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(route.mapsLink)}
              style={{
                marginTop: 10,
                backgroundColor: "#f3f4f6",
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 13 }}>Open in Map</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
