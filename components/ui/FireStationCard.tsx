import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { formatDistance } from "../../services/uiHelpers";

interface FireStationCardProps {
  name: string;
  address: string;
  distance: number;
  eta: string;
  available?: boolean;
  isLoading?: boolean;
  onSelect: () => void;
  isNearest?: boolean;
}

export const FireStationCard = ({
  name,
  address,
  distance,
  eta,
  available = true,
  isLoading = false,
  onSelect,
  isNearest = false,
}: FireStationCardProps) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={isLoading || !available}
      style={[
        styles.container,
        {
          opacity: available ? 1 : 0.6,
          borderColor: isNearest ? "#E74C3C" : "#E8E8E8",
          borderWidth: isNearest ? 2 : 1,
          backgroundColor: isNearest ? "#FFF5F3" : "white",
        },
      ]}
      activeOpacity={0.7}
    >
      {isNearest && (
        <View style={styles.nearestBadge}>
          <Text style={styles.nearestText}>🔥 Nearest</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.stationIcon}>
          <Text style={styles.iconText}>🚒</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.stationName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {address}
          </Text>
        </View>

        {isLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#E74C3C" />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Distance</Text>
          <Text style={styles.infoValue}>{formatDistance(distance)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>ETA</Text>
          <Text style={[styles.infoValue, { color: "#E74C3C" }]}>{eta}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text
            style={[
              styles.infoValue,
              {
                color: available ? "#27AE60" : "#E74C3C",
              },
            ]}
          >
            {available ? "Available" : "Busy"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  nearestBadge: {
    backgroundColor: "#FFE6E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  nearestText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E74C3C",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE6E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  iconText: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  stationName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: "#999",
  },
  loader: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#E8E8E8",
    marginHorizontal: 8,
  },
});
