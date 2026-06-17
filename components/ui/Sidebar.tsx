import {
  View, Text, TouchableOpacity, Animated, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "../../hooks/useTranslation";
import LanguageSwitcher from "../LanguageSwitcher";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
  visible: boolean;
  sidebarAnim: Animated.Value;
  nickname?: string;
  onClose: () => void;
  onLogout: () => void;
};

export default function Sidebar({ visible, sidebarAnim, nickname, onClose, onLogout }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!visible) return null;

  const menuItems = [
    {
      icon: "👤",
      label: t("sidebar.profile"),
      bg: "#fdf0eb",
      onPress: () => { onClose(); router.push("/(tabs)/profile" as any); },
    },
    {
      icon: "📋",
      label: t("sidebar.history"),
      bg: "#f0f4ff",
      onPress: () => { onClose(); router.push("/(feat)/history" as any); },
    },
    {
      icon: "💬",
      label: t("sidebar.messages"),
      bg: "#f0fdf4",
      onPress: () => { onClose(); router.push("/(feat)/chat-list" as any); },
    },
  ];

  return (
    <View style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Backdrop */}
      <TouchableOpacity
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
        onPress={onClose}
        activeOpacity={1}
      />

      {/* Drawer */}
      <Animated.View style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: SCREEN_WIDTH * 0.74,
        backgroundColor: "#aa411e39",
        transform: [{ translateX: sidebarAnim }],
        paddingTop: 62, paddingHorizontal: 22,
        shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 14,
        borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
      }}>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: "absolute", top: 54, right: 18,
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: "#f5f5f5",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16, color: "#959595" }}>✕</Text>
        </TouchableOpacity>

        {/* Profile area */}
        <View style={{
          alignItems: "center", marginBottom: 24,
          paddingBottom: 22, borderBottomWidth: 1.5, borderBottomColor: "#f0f0f0",
        }}>
          <View style={{
            width: 70, height: 70, borderRadius: 35,
            backgroundColor: "#fdf0eb",
            alignItems: "center", justifyContent: "center", marginBottom: 10,
            borderWidth: 2, borderColor: "#c4451a30",
            shadowColor: "#c4451a", shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
          }}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
          <Text style={{ color: "#111", fontSize: 16, fontWeight: "800" }}>
            {nickname ?? "User"}
          </Text>
          <View style={{
            marginTop: 5, paddingHorizontal: 10, paddingVertical: 3,
            backgroundColor: "#f0fdf4", borderRadius: 20,
            borderWidth: 1, borderColor: "#bbf7d0",
          }}>
            <Text style={{ color: "#166534", fontSize: 11, fontWeight: "700" }}>
              LifeLine BD Member
            </Text>
          </View>
        </View>

        <LanguageSwitcher compact />

        {/* Menu items */}
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={item.onPress}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              paddingVertical: 13, paddingHorizontal: 10,
              borderRadius: 14, marginBottom: 4,
            }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: item.bg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <Text style={{ color: "#faf7f7", fontSize: 15, fontWeight: "600" }}>
              {item.label}
            </Text>
            <Text style={{ color: "#ccc", marginLeft: "auto", fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 1.5, backgroundColor: "#f0f0f0", marginVertical: 14 }} />

        {/* Logout */}
        <TouchableOpacity
          onPress={onLogout}
          style={{
            flexDirection: "row", alignItems: "center", gap: 14,
            paddingVertical: 13, paddingHorizontal: 10,
            borderRadius: 14, backgroundColor: "#fff5f5",
          }}
          activeOpacity={0.7}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "#fee2e2",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
          </View>
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "700" }}>{t("common.logout")}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}