import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

export function FireServiceGridCard({ icon, title, description, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 14,
    marginBottom: 12,
    minHeight: 150,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    borderColor: "#E67E22",
    borderWidth: 2,
    backgroundColor: "#FFF8F3",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFE8D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  icon: { fontSize: 24 },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  desc: {
    fontSize: 11,
    color: "#666",
    lineHeight: 15,
  },
});
