import { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useLanguage } from "../../contexts/LanguageContext";

const ACCOUNT_COLORS: Record<AccountType, string> = {
  operator: "bg-purple-600",
  volunteer: "bg-teal-600",
  citizen: "bg-green-600",
};

export default function WelcomeBanner() {
  const { showWelcome, setShowWelcome, nickname, accountType } = useAuthStore();
  const { t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (showWelcome) {
      Animated.sequence([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.delay(4000),
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => setShowWelcome(false));
    }
  }, [showWelcome]);

  if (!showWelcome || !nickname || !accountType) return null;

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowWelcome(false));
  };

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="absolute top-0 left-0 right-0 z-50"
    >
      <View className={`${ACCOUNT_COLORS[accountType]} mx-4 mt-14 rounded-2xl px-5 py-4 flex-row items-center shadow-lg`}>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">
            {t("banner.welcome", { name: nickname })}
          </Text>
          <Text className="text-white opacity-80 text-sm mt-0.5">
            {t("banner.loggedInAs", { role: t(`banner.${accountType}`) })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          className="bg-white bg-opacity-20 rounded-full w-8 h-8 items-center justify-center ml-3"
        >
          <Text className="text-white font-bold text-base">✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}