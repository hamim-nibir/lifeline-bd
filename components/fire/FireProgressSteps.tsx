import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FIRE_WIZARD_STEPS } from "../../store/fireRequestStore";

const ORANGE = "#E67E22";
const GREEN = "#27AE60";
const GRAY = "#BDC3C7";

type Props = {
  currentStep: number;
};

export function FireProgressSteps({ currentStep }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {FIRE_WIZARD_STEPS.map((_, index) => (
          <View key={index} style={styles.stepWrap}>
            <View
              style={[
                styles.circle,
                index < currentStep && styles.circleDone,
                index === currentStep && styles.circleActive,
              ]}
            >
              {index < currentStep ? (
                <Text style={styles.circleText}>✓</Text>
              ) : (
                <Text style={styles.circleText}>{index + 1}</Text>
              )}
            </View>
            {index < FIRE_WIZARD_STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  index < currentStep ? styles.lineDone : styles.linePending,
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {FIRE_WIZARD_STEPS.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.label,
              index < currentStep && styles.labelDone,
              index === currentStep && styles.labelActive,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  stepWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GRAY,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: { backgroundColor: GREEN },
  circleActive: { backgroundColor: ORANGE },
  circleText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  line: { flex: 1, height: 3, marginHorizontal: 2 },
  lineDone: { backgroundColor: GREEN },
  linePending: { backgroundColor: GRAY },
  labels: {
    flexDirection: "row",
    marginTop: 10,
    paddingHorizontal: 2,
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: "#95A5A6",
    fontWeight: "500",
  },
  labelDone: { color: GREEN, fontWeight: "600" },
  labelActive: { color: ORANGE, fontWeight: "700" },
});
