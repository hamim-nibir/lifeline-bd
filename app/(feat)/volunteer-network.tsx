import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

type Volunteer = {
  id: string;
  name: string;
  skill: string;
  eta: string;
  phone: string;
  latitude: number;
  longitude: number;
};

const getNearbyVolunteers = (latitude: number, longitude: number): Volunteer[] => [
  {
    id: "v1",
    name: "Rahim Ahmed",
    skill: "First Aid",
    eta: "4 min",
    phone: "01700000001",
    latitude: latitude + 0.002,
    longitude: longitude + 0.0018,
  },
  {
    id: "v2",
    name: "Nusrat Jahan",
    skill: "Traffic Support",
    eta: "6 min",
    phone: "01700000002",
    latitude: latitude - 0.0015,
    longitude: longitude + 0.0022,
  },
  {
    id: "v3",
    name: "Moin Khan",
    skill: "CPR Trained",
    eta: "8 min",
    phone: "01700000003",
    latitude: latitude + 0.0012,
    longitude: longitude - 0.002,
  },
];

export default function VolunteerNetworkScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required.");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const current = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setLocation(current);
        setVolunteers(getNearbyVolunteers(current.latitude, current.longitude));
      } catch {
        Alert.alert("Error", "Could not fetch your location.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quickHelpText = useMemo(() => {
    if (!volunteers.length) return "No responders available right now";
    return `${volunteers.length} nearby volunteers can provide faster initial assistance`;
  }, [volunteers]);

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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Volunteer Responder Network
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            Connect with nearby volunteers quickly
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
            backgroundColor: "#ecfeff",
            borderWidth: 1,
            borderColor: "#a5f3fc",
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "#0e7490", fontWeight: "700", fontSize: 14 }}>
            Faster initial assistance
          </Text>
          <Text style={{ color: "#155e75", fontSize: 12, marginTop: 4 }}>{quickHelpText}</Text>
        </View>

        <View
          style={{
            height: 200,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            marginBottom: 14,
            backgroundColor: "#fff",
          }}
        >
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={{ color: "#9ca3af", marginTop: 10 }}>Finding volunteers...</Text>
            </View>
          ) : location ? (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation
            >
              <Marker coordinate={location} title="You" pinColor="orange" />
              {volunteers.map((volunteer) => (
                <Marker
                  key={volunteer.id}
                  coordinate={{ latitude: volunteer.latitude, longitude: volunteer.longitude }}
                  title={volunteer.name}
                  description={volunteer.skill}
                />
              ))}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#6b7280" }}>Location unavailable</Text>
            </View>
          )}
        </View>

        {volunteers.map((volunteer) => (
          <View
            key={volunteer.id}
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
              <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>{volunteer.name}</Text>
              <Text style={{ color: "#0f766e", fontWeight: "700", fontSize: 12 }}>{volunteer.eta}</Text>
            </View>
            <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>{volunteer.skill}</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${volunteer.phone}`)}
              style={{
                backgroundColor: "#f97316",
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Call Volunteer</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
