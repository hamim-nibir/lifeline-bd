import { Tabs } from "expo-router";
import { View, Text } from "react-native";

type TabIconProps = {
  focused: boolean;
  icon: string;
  label: string;
};

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View className="items-center justify-center gap-1 mt-2">
      <Text
        className={`text-2xl ${focused ? "opacity-100" : "opacity-40"}`}
      >
        {icon}
      </Text>
      <Text
        className={`text-xs font-medium ${
          focused ? "text-red-600" : "text-gray-400"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
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
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🔍" label="Search" />
          ),
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🩸" label="Request" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🔔" label="Alerts" />
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
  );
}