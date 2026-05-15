import {
  View, Text, TouchableOpacity, Linking,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";

type Props = {
  headerAnim: Animated.Value;
  headerOpacity: Animated.Value;
  onOpenSidebar: () => void;
};

export default function featHeader({ headerAnim, headerOpacity, onOpenSidebar }: Props) {
    const router = useRouter();
  return (
    <Animated.View
      style={{
        transform: [{ translateY: headerAnim }],
        opacity: headerOpacity,
        backgroundColor: "#1a4a4a",
        paddingTop: 54,
        paddingBottom: 14,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
    >
      {/* Left: Logo + Title */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 }}>
            অভয়
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.61)", fontSize: 10, letterSpacing: 1 }}>
            LIFELINE BD
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
