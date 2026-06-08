import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { FireWizardHeader } from "../../components/fire/FireWizardHeader";
import { FireProgressSteps } from "../../components/fire/FireProgressSteps";
import { useFireRequestStore } from "../../store/fireRequestStore";
import {
  fetchNearbyFireStations,
  FireStationCandidate,
  etaRangeFromDistanceKm,
} from "../../services/fireStations";
import { reverseGeocode } from "../../services/geocoding";
import { triggerHaptic, showToast } from "../../services/uiHelpers";

export default function FireLocationScreen() {
  const router = useRouter();
  const { service, setLocation, setStation, station: savedStation } = useFireRequestStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [stations, setStations] = useState<FireStationCandidate[]>([]);
  const [selected, setSelected] = useState<FireStationCandidate | null>(savedStation);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to find the nearest fire station.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setUserPos({ lat, lng });

      let locText = `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const geo = await reverseGeocode({ latitude: lat, longitude: lng });
        if (geo?.display_name) locText = geo.display_name;
      } catch {
        /* ignore */
      }
      setAddress(locText);
      setLocation(lat, lng, locText);

      const list = await fetchNearbyFireStations(lat, lng);
      setStations(list);
      if (list.length > 0) {
        setSelected((prev) => prev ?? list[0]);
        setStation(list[0]);
      }
    } catch (e) {
      console.warn(e);
      setError("Could not load your location. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [setLocation, setStation]);

  useEffect(() => {
    if (!service) {
      router.replace("/(feat)/fire-emergency");
      return;
    }
    void load();
  }, [service, router, load]);

  const onSelectStation = (s: FireStationCandidate) => {
    void triggerHaptic("light");
    setSelected(s);
    setStation(s);
  };

  const onContinue = async () => {
    if (!selected || !userPos) return;
    await triggerHaptic("medium");
    setStation(selected);
    router.push("/(feat)/fire-confirm");
  };

  const refreshLocation = async () => {
    await load();
    showToast("Location refreshed", "success");
  };

  if (!service) return null;

  const region = userPos
    ? {
        latitude: userPos.lat,
        longitude: userPos.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : undefined;

  return (
    <View style={styles.root}>
      <FireWizardHeader
        title="Location & Fire Station"
        subtitle="Confirming your location and nearest fire station"
        backLabel="← Back"
        onBack={() => router.back()}
      />
      <FireProgressSteps currentStep={2} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E67E22" />
          <Text style={styles.hint}>Locating you and nearest stations…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {region && (
            <View style={styles.mapWrap}>
              <MapView style={styles.map} initialRegion={region}>
                <Marker
                  coordinate={{ latitude: userPos!.lat, longitude: userPos!.lng }}
                  title="Your Location"
                  description={address}
                  pinColor="#3498DB"
                />
                {selected && (
                  <Marker
                    coordinate={{
                      latitude: selected.latitude,
                      longitude: selected.longitude,
                    }}
                    title={selected.name}
                    description={selected.address}
                    pinColor="#E67E22"
                  />
                )}
              </MapView>
              {selected && (
                <View style={styles.mapOverlay}>
                  <Text style={styles.overlayTitle}>Nearest Fire Station</Text>
                  <Text style={styles.overlayStation}>{selected.name}</Text>
                  <Text style={styles.overlayMeta}>
                    {selected.distanceKm.toFixed(1)} km • ~{etaRangeFromDistanceKm(selected.distanceKm)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.cardsRow}>
            <View style={[styles.infoCard, styles.infoCardBlue]}>
              <Text style={styles.cardIcon}>📍</Text>
              <Text style={styles.cardTitle}>Your Location</Text>
              <Text style={styles.cardBody} numberOfLines={3}>
                {address || "—"}
              </Text>
              <TouchableOpacity onPress={refreshLocation}>
                <Text style={styles.cardLink}>↻ Use Current Location</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoCard, styles.infoCardOrange]}>
              <Text style={styles.cardIcon}>🔥</Text>
              <Text style={styles.cardTitle}>Nearest Fire Station</Text>
              <Text style={styles.cardBodyBold}>{selected?.name ?? "—"}</Text>
              {selected && (
                <>
                  <Text style={styles.cardMeta}>
                    Distance: {selected.distanceKm.toFixed(1)} km
                  </Text>
                  <Text style={styles.cardEta}>
                    ~{etaRangeFromDistanceKm(selected.distanceKm)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {stations.length > 1 && (
            <View style={styles.altSection}>
              <Text style={styles.altTitle}>Other nearby stations</Text>
              {stations.slice(1, 4).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.altRow, selected?.id === s.id && styles.altRowActive]}
                  onPress={() => onSelectStation(s)}
                >
                  <Text style={styles.altName}>{s.name}</Text>
                  <Text style={styles.altDist}>{s.distanceKm.toFixed(1)} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !selected && styles.primaryBtnDisabled]}
            disabled={!selected}
            onPress={onContinue}
          >
            <Text style={styles.primaryBtnText}>Continue to Confirmation ✓</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  hint: { marginTop: 12, color: "#666" },
  errorText: { color: "#DC2626", textAlign: "center", marginBottom: 16 },
  retryBtn: {
    backgroundColor: "#E67E22",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  mapWrap: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  map: { flex: 1 },
  mapOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 10,
  },
  overlayTitle: { fontSize: 11, color: "#E67E22", fontWeight: "700" },
  overlayStation: { fontSize: 14, fontWeight: "800", color: "#222" },
  overlayMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  cardsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  infoCardBlue: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  infoCardOrange: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  cardIcon: { fontSize: 20, marginBottom: 6 },
  cardTitle: { fontSize: 12, fontWeight: "800", color: "#333", marginBottom: 6 },
  cardBody: { fontSize: 11, color: "#555", lineHeight: 15, marginBottom: 8 },
  cardBodyBold: { fontSize: 12, fontWeight: "700", color: "#222", marginBottom: 6 },
  cardMeta: { fontSize: 11, color: "#666" },
  cardEta: { fontSize: 12, fontWeight: "700", color: "#E67E22", marginTop: 2 },
  cardLink: { fontSize: 11, color: "#3498DB", fontWeight: "700" },
  altSection: { marginBottom: 16 },
  altTitle: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 8 },
  altRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  altRowActive: { borderColor: "#E67E22", backgroundColor: "#FFF8F3" },
  altName: { fontSize: 13, fontWeight: "600", flex: 1 },
  altDist: { fontSize: 12, color: "#E67E22", fontWeight: "700" },
  primaryBtn: {
    backgroundColor: "#E67E22",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
