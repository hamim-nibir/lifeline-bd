import { View, Text } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

export default function NotificationsScreen() {
  const { t } = useLanguage();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-gray-400 text-base">{t("placeholders.notifications")}</Text>
    </View>
  );
}