import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import type { AppLocale } from "../store/languageStore";

type Props = {
  compact?: boolean;
};

export default function LanguageSwitcher({ compact }: Props) {
  const { t, locale, setLocale } = useTranslation();

  const set = (next: AppLocale) => {
    if (next !== locale) void setLocale(next);
  };

  if (compact) {
    return (
      <View style={{ flexDirection: "row", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#fed7aa" }}>
        {(["en", "bn"] as AppLocale[]).map((code) => {
          const active = locale === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => set(code)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: active ? "#c4451a" : "#fff7ed",
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: "800",
                color: active ? "#fff" : "#9a3412",
              }}>
                {code === "en" ? t("language.enShort") : t("language.bnShort")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#f3f4f6",
    }}>
      <Text style={{ fontSize: 15, fontWeight: "800", color: "#111" }}>{t("language.title")}</Text>
      <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4, marginBottom: 12 }}>
        {t("language.subtitle")}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["en", "bn"] as AppLocale[]).map((code) => {
          const active = locale === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => set(code)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: active ? "#c4451a" : "#f9fafb",
                borderWidth: 1.5,
                borderColor: active ? "#c4451a" : "#e5e7eb",
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: "800",
                color: active ? "#fff" : "#374151",
              }}>
                {code === "en" ? t("language.english") : t("language.bangla")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
