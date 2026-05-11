import { Text, TouchableOpacity } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

export default function LanguageSwitcher() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      accessibilityRole="button"
      accessibilityLabel={language === "en" ? t("language.switchToBangla") : t("language.switchToEnglish")}
      style={{
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
        minWidth: 52,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
        {language === "en" ? "বাং" : "EN"}
      </Text>
    </TouchableOpacity>
  );
}
