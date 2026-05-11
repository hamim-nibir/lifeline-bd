import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

type Shelter = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  contact: string;
};

const SHELTERS: Shelter[] = [
  { id: "1", name: "Cyclone Shelter, Kalapara (Patuakhali)", latitude: 21.9992, longitude: 90.2421, capacity: 1200, contact: "04426-56012" },
  { id: "2", name: "Cyclone Shelter, Dacope (Khulna)", latitude: 22.5813, longitude: 89.5211, capacity: 900, contact: "041-761245" },
  { id: "3", name: "Cyclone Shelter, Kutubdia (Cox's Bazar)", latitude: 21.8197, longitude: 91.8559, capacity: 1500, contact: "0341-62411" },
];

const WARNING_LEVELS = ["High", "Medium", "Low"] as const;

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function DisasterAlertsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [warningFilter, setWarningFilter] = useState<"all" | "flood" | "cyclone">("all");
  const [kitChecked, setKitChecked] = useState({
    water: false,
    medicine: false,
    flashlight: false,
  });

  const riskIndex = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const monsoonSeason = month >= 6 && month <= 10;
    const isCoastal = userCoords ? userCoords.latitude < 22.8 : true;
    const lowElevationZone = userCoords ? userCoords.latitude < 23.2 && userCoords.longitude > 89.5 : true;

    // Logical AND based risk mapping
    if (monsoonSeason && isCoastal && lowElevationZone) return 0; // High
    if (monsoonSeason && (isCoastal || lowElevationZone)) return 1; // Medium
    return 2; // Low
  }, [userCoords]);

  const handleUseLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.alerts"), t("disaster.locationNeeded"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      Alert.alert(t("common.alerts"), t("disaster.locationFailed"));
    } finally {
      setLoadingLocation(false);
    }
  };

  const shelters = useMemo(() => {
    if (!userCoords) {
      return SHELTERS.map((s) => ({ ...s, distanceKm: null as number | null }));
    }
    return SHELTERS.map((s) => ({
      ...s,
      distanceKm: getDistanceKm(
        userCoords.latitude,
        userCoords.longitude,
        s.latitude,
        s.longitude
      ),
    })).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [userCoords]);

  const openMap = (shelter: Shelter) => {
    Linking.openURL(`https://maps.google.com/?q=${shelter.latitude},${shelter.longitude}`);
  };

  const riskColor = riskIndex === 0 ? "#dc2626" : riskIndex === 1 ? "#d97706" : "#15803d";
  const checklistProgress =
    Object.values(kitChecked).filter(Boolean).length / Object.values(kitChecked).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#0f766e",
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
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>{t("disaster.title")}</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{t("disaster.subtitle")}</Text>
        </View>
        <View style={{ marginLeft: "auto" }}>
          <LanguageSwitcher />
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
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#d1fae5",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#0f766e", fontWeight: "700", fontSize: 15 }}>{t("disaster.riskLevel")}</Text>
          <Text style={{ color: riskColor, fontSize: 26, fontWeight: "800", marginTop: 2 }}>
            {WARNING_LEVELS[riskIndex]}
          </Text>
        </View>

        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 16, marginBottom: 12 }}>
          <Text style={{ color: "#1f2937", fontWeight: "700", marginBottom: 8 }}>{t("disaster.warning")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {[
              { id: "all" as const, label: t("disaster.filterAll") },
              { id: "flood" as const, label: t("disaster.filterFlood") },
              { id: "cyclone" as const, label: t("disaster.filterCyclone") },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setWarningFilter(f.id)}
                style={{
                  backgroundColor: warningFilter === f.id ? "#e0f2fe" : "#f3f4f6",
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: warningFilter === f.id ? "#0369a1" : "#4b5563", fontSize: 11, fontWeight: "700" }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {(warningFilter === "all" || warningFilter === "flood") && (
            <Text style={{ color: "#4b5563", fontSize: 12, marginBottom: 6 }}>• {t("disaster.prepareKit")}</Text>
          )}
          {(warningFilter === "all" || warningFilter === "cyclone") && (
            <Text style={{ color: "#4b5563", fontSize: 12, marginBottom: 6 }}>• {t("disaster.avoidTravel")}</Text>
          )}
          <Text style={{ color: "#4b5563", fontSize: 12 }}>• {t("disaster.monitorUpdate")}</Text>
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>{t("disaster.nearestShelter")}</Text>
          <TouchableOpacity
            onPress={handleUseLocation}
            disabled={loadingLocation}
            style={{
              backgroundColor: "#0f766e",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>{t("disaster.useLocation")}</Text>
            )}
          </TouchableOpacity>

          {shelters.map((shelter) => (
            <View
              key={shelter.id}
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 13 }}>{shelter.name}</Text>
              <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                {t("disaster.capacity")}: {shelter.capacity}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {t("disaster.contact")}: {shelter.contact}
              </Text>
              {shelter.distanceKm !== null && (
                <Text style={{ color: "#0f766e", fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                  {shelter.distanceKm.toFixed(2)} km
                </Text>
              )}
              <TouchableOpacity onPress={() => openMap(shelter)} style={{ marginTop: 8 }}>
                <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 12 }}>{t("disaster.openMap")}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: "#fffbeb",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#fde68a",
            padding: 14,
            marginTop: 12,
          }}
        >
          <Text style={{ color: "#92400e", fontWeight: "700", marginBottom: 6 }}>{t("disaster.preparednessTitle")}</Text>
          <Text style={{ color: "#a16207", fontSize: 12, marginBottom: 2 }}>• {t("disaster.emergencyBag")}</Text>
          <Text style={{ color: "#a16207", fontSize: 12, marginBottom: 2 }}>• {t("disaster.familyPlan")}</Text>
          <Text style={{ color: "#a16207", fontSize: 12 }}>• {t("disaster.emergencyMode")}</Text>

          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: "#fde68a", paddingTop: 10 }}>
            <Text style={{ color: "#92400e", fontWeight: "700", marginBottom: 8 }}>{t("disaster.bagChecklist")}</Text>
            {[
              { key: "water" as const, label: t("disaster.bagWater") },
              { key: "medicine" as const, label: t("disaster.bagMedicine") },
              { key: "flashlight" as const, label: t("disaster.bagFlashlight") },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setKitChecked((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
              >
                <Text style={{ fontSize: 14, marginRight: 8 }}>{kitChecked[item.key] ? "✅" : "⬜"}</Text>
                <Text style={{ color: "#78350f", fontSize: 12 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ color: "#92400e", fontSize: 12, marginTop: 4 }}>
              {t("disaster.readyPercent")}: {(checklistProgress * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#f3f4f6", padding: 14, marginTop: 12 }}>
          <Text style={{ color: "#1f2937", fontWeight: "700", marginBottom: 10 }}>{t("disaster.updates")}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => Alert.alert(t("common.alerts"), t("disaster.reportedSafe"))}
              style={{ flex: 1, backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
            >
              <Text style={{ color: "#166534", fontWeight: "700", fontSize: 12 }}>{t("disaster.reportSafe")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert(t("common.alerts"), t("disaster.rescueRequested"))}
              style={{ flex: 1, backgroundColor: "#fee2e2", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
            >
              <Text style={{ color: "#991b1b", fontWeight: "700", fontSize: 12 }}>{t("disaster.requestRescue")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
