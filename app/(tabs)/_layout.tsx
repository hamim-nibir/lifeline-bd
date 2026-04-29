import { Tabs, useRouter } from "expo-router";
import { View, Text, Image } from "react-native";
import { ImageSourcePropType } from "react-native";
//import WelcomeBanner from "../../components/ui/WelcomeBanner";

type TabIconProps = { focused: boolean; icon: string | ImageSourcePropType; label: string };

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 8, width: 70, }}>
      {/* 👇 Detect if icon is image or text */}
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
      
      {/*<Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{icon}</Text>*/}
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

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/*<WelcomeBanner />*/}
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
              <TabIcon focused={focused} icon={require('../../assets/home.png')} label="Home"/> /*icon="🏠" label="Home"*/
            ),
          }}
        />
        <Tabs.Screen
          name="Services"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={require('../../assets/service.png')} label="Services" />/*icon="📊"*/
            ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={require('../../assets/Report.png')} label="Report" />
            ),
          }}
        />
        <Tabs.Screen
          name="disaster"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={require('../../assets/disaster.png')} label="Disaster" />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={require('../../assets/community.png')} label="Community" />
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
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📊" label="Dashboard" />
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
          name="notifications"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🔔" label="Alerts" />
            ),
          }}
        />
          
      </Tabs>
    </View>
    
  );
}
