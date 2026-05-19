import { useRef, useState } from "react";
import { View, Animated, Easing, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import AppHeader from "../../components/AppHeader";
import Sidebar from "../../components/ui/Sidebar";
import { useAuthStore } from "../../store/authStore";
import { logoutUser } from "../../services/auth";
import CitizenReportHub from "../../components/reports/CitizenReportHub";
import OperatorReportInbox from "../../components/reports/OperatorReportInbox";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ReportScreen() {
  const router = useRouter();
  const { nickname, accountType } = useAuthStore();
  const isOperator = accountType === "operator";

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(sidebarAnim, {
      toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: SCREEN_WIDTH, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  const handleLogout = async () => {
    closeSidebar();
    await logoutUser();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <AppHeader
        headerAnim={headerAnim}
        headerOpacity={headerOpacity}
        onOpenSidebar={openSidebar}
      />
      {isOperator ? (
        <OperatorReportInbox embedded />
      ) : (
        <CitizenReportHub />
      )}
      <Sidebar
        visible={sidebarVisible}
        sidebarAnim={sidebarAnim}
        nickname={nickname ?? undefined}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />
    </View>
  );
}
