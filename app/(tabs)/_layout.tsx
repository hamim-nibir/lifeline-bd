import { Tabs } from "expo-router";
import { View, Text, Image } from "react-native";
import { ImageSourcePropType } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../hooks/useTranslation";

type TabIconProps = {
  focused: boolean;
  icon: string | ImageSourcePropType;
  label: string;
};

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={{
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      width: 70,
    }}>
      {typeof icon === "string" ? (
        <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
          {icon}
        </Text>
      ) : (
        <Image
          source={icon as any}
          style={{
            width: 24,
            height: 24,
            opacity: focused ? 1 : 0.4,
            tintColor: focused ? "#c4451a" : "#9ca3af",
          }}
          resizeMode="contain"
        />
      )}
      <Text style={{
        fontSize: 10,
        fontWeight: "600",
        color: focused ? "#c4451a" : "#9ca3af",
        marginTop: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}

function ReportTabIcon({ focused }: { focused: boolean }) {
  const accountType = useAuthStore((s) => s.accountType);
  const { t } = useTranslation();
  const label = accountType === "operator" ? t("tabs.review") : t("tabs.report");
  return <TabIcon focused={focused} icon="📋" label={label} />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
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
        {/* Visible tabs */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                icon={require("../../assets/home.png")}
                label={t("tabs.home")}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="report"
          options={{
            tabBarIcon: ({ focused }) => <ReportTabIcon focused={focused} />,
          }}
        />

        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📊" label={t("tabs.services")} />
            ),
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🔔" label={t("tabs.notifications")} />
            ),
          }}
        />

        {/* Hidden — not shown in navbar */}
        <Tabs.Screen name="profile"  options={{ href: null }} />
        <Tabs.Screen name="police"   options={{ href: null }} />
      </Tabs>
    </View>
  );
}