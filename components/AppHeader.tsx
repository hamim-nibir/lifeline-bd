import { View, Text, TouchableOpacity, Linking, Animated } from "react-native";
import Logo from "./ui/logo";

type Props = {
  headerAnim: Animated.Value;
  headerOpacity: Animated.Value;
  onOpenSidebar: () => void;
};

export default function AppHeader({ headerAnim, headerOpacity, onOpenSidebar }: Props) {
  return (
    <Animated.View
      style={{
        transform: [{ translateY: headerAnim }],
        opacity: headerOpacity,
        backgroundColor: "#c4451a",
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
      {/* Left: Logo */}
      <Logo size={38} showText />

      {/* Right: 999 Button + Hamburger */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL("tel:999")}
          style={{
            backgroundColor: "#c4451a",
            borderRadius: 22,
            paddingHorizontal: 14,
            paddingVertical: 7,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            shadowColor: "#c4451a",
            shadowOpacity: 0.45,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 12 }}>📞</Text>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }}>
            999
          </Text>
        </TouchableOpacity>

        {/* Hamburger menu */}
        <TouchableOpacity onPress={onOpenSidebar} style={{ gap: 5, padding: 4 }}>
          <View style={{ width: 20, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
          <View style={{ width: 14, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
          <View style={{ width: 20, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}