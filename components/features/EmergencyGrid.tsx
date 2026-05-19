import { View, Text, TouchableOpacity, Animated } from "react-native";

type Service = {
  label: string;
  icon: string;
  color: string;
  accent: string;
  route: string | null;
};

type Props = {
  services: Service[];
  cardAnims: Animated.Value[];
  cardOpacities: Animated.Value[];
  cardScales: Animated.Value[];
  onPress: (service: Service) => void;
};

export default function EmergencyGrid({
  services,
  cardAnims,
  cardOpacities,
  cardScales,
  onPress,
}: Props) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
      {services.map((s, i) => (
        <Animated.View
          key={s.label}
          style={{
            width: "47%",
            transform: [{ translateY: cardAnims[i] }, { scale: cardScales[i] }],
            opacity: cardOpacities[i],
          }}
        >
          <TouchableOpacity
            onPress={() => onPress(s)}
            style={{
              backgroundColor: "#fff",
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: "#e8e3dd",
              paddingVertical: 22,
              paddingHorizontal: 12,
              alignItems: "center",
              gap: 10,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
            activeOpacity={0.82}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: s.color,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: `${s.accent}25`,
                shadowColor: s.accent,
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 26 }}>{s.icon}</Text>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#111",
                textAlign: "center",
              }}
            >
              {s.label}
            </Text>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: s.color,
                borderWidth: 1,
                borderColor: `${s.accent}30`,
              }}
            >
              <Text style={{ fontSize: 10, color: s.accent, fontWeight: "700" }}>
                TAP TO CALL
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}