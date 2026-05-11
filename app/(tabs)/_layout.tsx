import { Tabs, useRouter } from "expo-router";
import { View, Text } from "react-native";
import WelcomeBanner from "../../components/ui/WelcomeBanner";
import { useLanguage } from "../../contexts/LanguageContext";

type TabIconProps = { focused: boolean; icon: string; label: string };

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 8, width: 58 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
      <Text style={{
        fontSize: 9,
        fontWeight: "600",
        color: focused ? "#f97316" : "#9ca3af",
        marginTop: 2,
        textAlign: "center",
      }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <View style={{ flex: 1 }}>
      <WelcomeBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
            height: 70,
            paddingBottom: 10,
            paddingTop: 5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🏠" label={t("common.home")} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📊" label={t("common.dashboard")} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🔍" label={t("common.search")} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🔔" label={t("common.alerts")} />
            ),
          }}
        />
        <Tabs.Screen
          name="reporting"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📝" label={t("common.reporting")} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="👤" label={t("common.profile")} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}