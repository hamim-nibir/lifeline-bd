import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  featureName: string;
};

export default function VerificationGuard({ visible, onClose, featureName }: Props) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          alignItems: "center",
        }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🪪</Text>

          <Text style={{
            fontSize: 18, fontWeight: "700",
            color: "#1f2937", textAlign: "center", marginBottom: 8,
          }}>
            {t("verification.required")}
          </Text>

          <Text style={{
            fontSize: 14, color: "#6b7280",
            textAlign: "center", lineHeight: 22, marginBottom: 24,
          }}>
            {t("verification.needVerifiedAccount")}{" "}
            <Text style={{ fontWeight: "700", color: "#f97316" }}>
              {featureName}
            </Text>
            .{"\n"}
            {t("verification.verifyFirst")}
          </Text>

          {/* Go to profile button */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push("/(tabs)/profile" as any);
            }}
            style={{
              backgroundColor: "#f97316",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {t("verification.verifyAccount")}
            </Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#9ca3af", fontSize: 14 }}>
              {t("verification.maybeLater")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}