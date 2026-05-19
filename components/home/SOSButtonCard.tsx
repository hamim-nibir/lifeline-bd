import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import {
  cancelSOS,
  getEmergencyContacts,
  getLastSOSEvent,
  notifyEmergencyContacts,
  notifyEmergencyContactsCancelled,
  triggerSOS,
  updateSOSLocation,
} from "../../services/sos";

type SOSStatus = "idle" | "pressed" | "active";
const SOS_BUTTON_IMAGE = require("../../assets/emergency-services/sos-button.png");

export default function SOSButtonCard() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const [status, setStatus] = useState<SOSStatus>("idle");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingSend, setPendingSend] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [address, setAddress] = useState("Fetching your live location...");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeSOSId, setActiveSOSId] = useState<string | null>(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const countdownFireRef = useRef(false);

  const pulseDuration = status === "pressed" ? 900 : 1800;

  const requestLocation = async () => {
    const { status: permission } = await Location.requestForegroundPermissionsAsync();
    if (permission !== "granted") {
      setAddress("Location permission denied. Enable GPS to send SOS.");
      return;
    }

    const live = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ latitude: live.coords.latitude, longitude: live.coords.longitude });
    const place = await Location.reverseGeocodeAsync({
      latitude: live.coords.latitude,
      longitude: live.coords.longitude,
    });
    const first = place[0];
    if (first) {
      const pretty = [first.name, first.street, first.city, first.region]
        .filter(Boolean)
        .join(", ");
      setAddress(pretty || "Live location available");
    } else {
      setAddress("Live location available");
    }
  };

  const startLocationSharing = async (sosId: string) => {
    locationSub.current?.remove();
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,
        distanceInterval: 20,
      },
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setCoords({ latitude, longitude });
        await updateSOSLocation(sosId, latitude, longitude, address);
      }
    );
  };

  const triggerSOSFlow = async () => {
    if (!user?.uid || !coords) {
      Alert.alert("Missing location", "Enable GPS and try SOS again.");
      setConfirmVisible(false);
      setStatus("idle");
      return;
    }

    try {
      const sosId = await triggerSOS({
        userId: user.uid,
        userName: nickname ?? "Citizen",
        latitude: coords.latitude,
        longitude: coords.longitude,
        address,
      });

      const contacts = await getEmergencyContacts(user.uid);
      await notifyEmergencyContacts({
        userName: nickname ?? "Citizen",
        latitude: coords.latitude,
        longitude: coords.longitude,
        address,
        contacts,
      });

      setActiveSOSId(sosId);
      setStatus("active");
      setConfirmVisible(false);
      setPendingSend(false);
      setCountdown(3);
      await startLocationSharing(sosId);
      router.push(`/(feat)/sos-response?sosId=${sosId}`);
    } catch (error: any) {
      setConfirmVisible(false);
      setPendingSend(false);
      setCountdown(3);
      setStatus("idle");
      Alert.alert("SOS failed", error?.message ?? "Unable to trigger SOS.");
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const restore = async () => {
        if (!user?.uid) return;
        try {
          const last = await getLastSOSEvent(user.uid);
          if (cancelled) return;
          if (last?.status === "active") {
            setActiveSOSId(last.id);
            setStatus("active");
            await startLocationSharing(last.id);
          } else {
            setActiveSOSId(null);
            setStatus("idle");
            locationSub.current?.remove();
          }
        } catch {
          if (!cancelled) {
            setActiveSOSId(null);
            setStatus("idle");
          }
        }
      };
      void restore();
      return () => {
        cancelled = true;
      };
    }, [user?.uid])
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: pulseDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseDuration, rippleAnim]);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingSend) return;
    if (countdown <= 0) {
      if (!countdownFireRef.current) {
        countdownFireRef.current = true;
        setPendingSend(false);
        setConfirmVisible(false);
        void triggerSOSFlow().finally(() => {
          countdownFireRef.current = false;
        });
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pendingSend, countdown]);

  const rings = useMemo(() => [0, 1, 2], []);

  const handlePressSOS = () => {
    if (status === "active") {
      Alert.alert(
        "Cancel SOS?",
        "Operators will be notified that you cancelled this alert.",
        [
          { text: "Keep SOS", style: "cancel" },
          {
            text: "Cancel SOS",
            style: "destructive",
            onPress: () => void handleCancelSOS(),
          },
        ]
      );
      return;
    }
    setStatus("pressed");
    setConfirmVisible(true);
    setPendingSend(false);
    setCountdown(3);
  };

  const handleCancelSOS = async () => {
    if (!activeSOSId || !user?.uid) return;
    try {
      await cancelSOS(activeSOSId, {
        userName: nickname ?? "User",
        addressHint: address,
      });
      const contacts = await getEmergencyContacts(user.uid);
      await notifyEmergencyContactsCancelled({
        userName: nickname ?? "User",
        contacts,
      });
      locationSub.current?.remove();
      setActiveSOSId(null);
      setStatus("idle");
      Alert.alert("SOS cancelled", "Your SOS has been cancelled.");
    } catch (error: any) {
      Alert.alert("Cancel failed", error?.message ?? "Unable to cancel SOS right now.");
    }
  };

  const beginSendCountdown = () => {
    countdownFireRef.current = false;
    setCountdown(3);
    setPendingSend(true);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Are you in emergency?</Text>
      <Text style={styles.subtitle}>Press the button below for immediate help.</Text>

      <View style={styles.centerArea}>
        {status !== "active" &&
          rings.map((item) => {
            const scale = rippleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.75 + item * 0.12],
            });
            const opacity = rippleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55 - item * 0.12, 0],
            });
            return (
              <Animated.View
                key={item}
                style={[
                  styles.ring,
                  {
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              />
            );
          })}

        <TouchableOpacity
          onPress={handlePressSOS}
          activeOpacity={0.9}
          style={styles.sosButton}
        >
          <Image source={SOS_BUTTON_IMAGE} style={styles.sosButtonImage} />
          {status === "active" && (
            <View style={styles.activeOverlay}>
              <Text style={styles.activeOverlayText}>Cancel SOS</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>Your current address</Text>
        <Text style={styles.locationValue}>{address}</Text>
      </View>

      {status === "active" && activeSOSId && (
        <TouchableOpacity
          style={styles.statusScreenBtn}
          onPress={() => router.push(`/(feat)/sos-response?sosId=${activeSOSId}`)}
        >
          <Text style={styles.statusScreenBtnText}>Open live SOS status</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push("/(feat)/emergency-contacts")}
        style={styles.manageContactsBtn}
      >
        <Text style={styles.manageContactsText}>Manage Emergency Contacts</Text>
      </TouchableOpacity>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setConfirmVisible(false);
          setPendingSend(false);
          setCountdown(3);
          setStatus("idle");
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send SOS Alert?</Text>
            {pendingSend ? (
              <Text style={styles.modalBody}>Sending in {countdown}…</Text>
            ) : (
              <Text style={styles.modalBody}>This will notify operators and your emergency contacts.</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setConfirmVisible(false);
                  setPendingSend(false);
                  setCountdown(3);
                  setStatus("idle");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, pendingSend && { opacity: 0.7 }]}
                disabled={pendingSend}
                onPress={beginSendCountdown}
              >
                <Text style={styles.modalConfirmText}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  centerArea: {
    marginTop: 16,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "rgba(249, 115, 22, 0.5)",
  },
  sosButton: {
    width: 172,
    height: 172,
    borderRadius: 86,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  sosButtonImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    transform: [{ scale: 1.14 }],
  },
  activeOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(185, 28, 28, 0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeOverlayText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  locationCard: {
    marginTop: 4,
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 12,
  },
  locationLabel: {
    color: "#9a3412",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  locationValue: {
    marginTop: 5,
    color: "#7c2d12",
    fontSize: 13,
    fontWeight: "500",
  },
  statusScreenBtn: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#ea580c",
    paddingVertical: 11,
    alignItems: "center",
  },
  statusScreenBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  manageContactsBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  manageContactsText: {
    color: "#c2410c",
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "800",
  },
  modalBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 21,
  },
  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 11,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#4b5563",
    fontWeight: "700",
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    paddingVertical: 11,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "800",
  },
});
