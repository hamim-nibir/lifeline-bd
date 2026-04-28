import { Tabs, useRouter } from "expo-router";
import { View, Text } from "react-native";
import WelcomeBanner from "../../components/ui/WelcomeBanner";

type TabIconProps = { focused: boolean; icon: string; label: string };

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 8, width: 70, }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{icon}</Text>
      <Text style={{
        fontSize: 10,
        fontWeight: "600",
        color: focused ? "#f97316" : "#9ca3af",
        marginTop: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
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
              <TabIcon focused={focused} icon="🏠" label="Home" />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📊" label="Dashboard" />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="💬" label="Messages" />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🔔" label="Notifications" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="👤" label="Profile" />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}