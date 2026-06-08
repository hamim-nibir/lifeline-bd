import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { QuickEmergencyService } from "../../types";

const SERVICE_IMAGES = {
  ambulance: require("../../assets/emergency-services/ambulance.png"),
  fire: require("../../assets/emergency-services/fire.png"),
  police: require("../../assets/emergency-services/police.png"),
  unified: require("../../assets/emergency-services/unified.png"),
} as const;

const SERVICE_ICONS = {
  ambulance: "🚑",
  fire: "🔥",
  police: "🛡️",
  unified: "⚡",
} as const;

type QuickEmergencyServicesProps = {
  services: QuickEmergencyService[];
  onServicePress?: (service: QuickEmergencyService) => void;
};

export default function QuickEmergencyServices({
  services,
  onServicePress,
}: QuickEmergencyServicesProps) {
  const { width } = useWindowDimensions();

  const cardWidth = useMemo(() => {
    const horizontalPadding = 40;
    const gap = 12;
    return (width - horizontalPadding - gap) / 2;
  }, [width]);

  const handleCallNow = async (service: QuickEmergencyService) => {
    const phoneUrl = `tel:${service.hotline}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);

    if (!canOpen) {
      Alert.alert("Call unavailable", `Please dial ${service.hotline} manually.`);
      return;
    }

    await Linking.openURL(phoneUrl);
  };

  const getVehicleImageStyle = (imageKey: QuickEmergencyService["imageKey"]) => {
    if (imageKey === "ambulance" || imageKey === "fire") {
      return styles.vehicleImageShifted;
    }
    return styles.vehicleImage;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Emergency Services</Text>
      <Text style={styles.sectionSubtitle}>
        Select a service for immediate support.
      </Text>

      <View style={styles.grid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            activeOpacity={0.92}
            onPress={() => onServicePress?.(service)}
            style={[styles.card, { width: cardWidth }]}
          >
            <View style={styles.overlay}>
              <View style={styles.iconChip}>
                <Text style={styles.iconText}>
                  {SERVICE_ICONS[service.imageKey]}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{service.title}</Text>
                <Text style={styles.cardSubtitle}>{service.subtitle}</Text>
              </View>

              <Image
                source={SERVICE_IMAGES[service.imageKey]}
                style={getVehicleImageStyle(service.imageKey)}
              />

              <View style={styles.bottomRow}>
                <View style={styles.hotlineRow}>
                  <Text style={styles.phoneIcon}>◔</Text>
                  <Text style={styles.hotlineText}>{service.hotline}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleCallNow(service)}
                  style={styles.callButton}
                >
                  <Text style={styles.callButtonText}>Call Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  sectionSubtitle: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    minHeight: 170,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  overlay: {
    flex: 1,
    padding: 11,
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  iconText: {
    fontSize: 14,
  },
  infoCard: {
    marginTop: 8,
    width: "58%",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#f97316",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  vehicleImage: {
    position: "absolute",
    right: -18,
    top: 38,
    width: 122,
    height: 84,
    resizeMode: "contain",
  },
  vehicleImageShifted: {
    position: "absolute",
    right: -30,
    top: 38,
    width: 126,
    height: 86,
    resizeMode: "contain",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },
  hotlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phoneIcon: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
  hotlineText: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "700",
  },
  callButton: {
    backgroundColor: "#ea580c",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#7c2d12",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  callButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
});
