import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack: () => void;
};

export function FireWizardHeader({ title, subtitle, backLabel = "← Back to Home", onBack }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>{backLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#E67E22",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  back: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
  },
});
