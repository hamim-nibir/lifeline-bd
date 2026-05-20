import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

/** Legacy route — redirects to the new wizard location step */
export default function FireNearbyStationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(feat)/fire-location");
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#E67E22" />
    </View>
  );
}
